import { Types } from "mongoose";
import { UserJwtPayload } from "../middelware";
import Component from "../models/component.model";
import Application from "../models/resources/application.model";
import Table from "../models/resources/table.model";
import InformationObject from "../models/information/informationObject.models";
import ResourceFieldRelation from "../models/information/resourceFieldRelation.model";
import ResourceObjectRelation from "../models/information/resourceObjectRelation.model";
import { getResourceType, updateReceivedInformation } from "./externalRelation.service";

// Relations go between resources. When information goes into or out of a component (a script, a file), the
// resource the component is part of gets the relation:
// - a script reads information: what it reads from -> the host of the script
//   (reading from a file: the file location of the file -> the host of the script)
// - a script writes information: the host of the script -> what it writes to
//   (writing to a file: the host of the script -> the file location of the file)
// So two scripts on different resources that share a file give: host A -> file location -> host B.
// Every such relation goes via the script. Reading from or writing to the host itself gives no relation.
//
// What a script writes to, gets it directly:
// - an application takes it in as an input
// - a table gets a column for it; a table only has fields, so an object gives a column for each of its fields
// - an external element receives it (its received lists follow from the relations to it)
// (a file contains it: see addComponentEndInformation)
//
// This sync looks after every relation via a script component.
// A relation between the same resources for the same information that was added another way is left alone.

type Kind = 'field' | 'object';

interface DesiredRelation {
    kind: Kind;
    informationId: string;
    sourceId: string;
    sourceType: string;
    targetId: string;
    targetType: string;
    viaId: string;
}

interface EndInformation {
    informationFieldIds: Types.ObjectId[];
    informationObjectIds: Types.ObjectId[];
}

function relationKey(relation: Pick<DesiredRelation, 'kind' | 'informationId' | 'sourceId' | 'targetId'>) {
    return `${relation.kind}|${relation.informationId}|${relation.sourceId}|${relation.targetId}`;
}

function getEndIds(end: EndInformation, kind: Kind) {
    return (kind === 'field' ? end.informationFieldIds : end.informationObjectIds).map((id) => id.toString());
}

// The resource takes the written information in directly
export async function addScriptWrittenInput(user: UserJwtPayload, resourceId: string, kind: Kind, informationId: string) {
    const type = await getResourceType(user, resourceId);

    if(type === 'application') {
        const list = kind === 'field' ? 'inputInformationFields' : 'inputInformationObjects';
        const idKey = kind === 'field' ? 'informationFieldId' : 'informationObjectId';
        await Application.updateOne(
            { _id: resourceId, environmentId: user.environmentId, [`${list}.${idKey}`]: { $ne: informationId } },
            { $push: { [list]: { [idKey]: informationId, position: 1 } } }
        );
    }

    if(type === 'table') {
        const fieldIds = kind === 'field'
            ? [informationId]
            : ((await InformationObject.findOne({ _id: informationId, environmentId: user.environmentId }))?.informationFieldIds ?? []).map((id) => id.toString());
        for(const fieldId of fieldIds) {
            await Table.updateOne(
                { _id: resourceId, environmentId: user.environmentId, 'columns.informationFieldId': { $ne: fieldId } },
                { $push: { columns: { informationFieldId: fieldId, position: 0 } } }
            );
        }
    }
}

export async function syncScriptRelations(user: { environmentId: string }) {
    const environmentId = user.environmentId;
    const scripts = await Component.find({ environmentId, kind: 'script' });
    const writtenIds = [...new Set(scripts.flatMap((script) => script.outputs.map((end) => end.resourceId.toString())))];
    const applications = await Application.find({ environmentId, _id: { $in: writtenIds } });
    const tables = await Table.find({ environmentId, _id: { $in: writtenIds } });

    // A table only has fields: a written object reaches it through its fields
    const writtenObjectIds = scripts.flatMap((script) => script.outputs.flatMap((end) => end.informationObjectIds));
    const objects = await InformationObject.find({ environmentId, _id: { $in: writtenObjectIds } });
    const objectFieldIds = new Map(objects.map((object) => [object._id.toString(), object.informationFieldIds.map((id) => id.toString())]));

    const resourceTypes = new Map<string, string | undefined>();
    async function getType(resourceId: string) {
        if(!resourceTypes.has(resourceId)) {
            resourceTypes.set(resourceId, await getResourceType({ environmentId } as UserJwtPayload, resourceId));
        }
        return resourceTypes.get(resourceId);
    }

    const desired: DesiredRelation[] = [];
    for(const script of scripts) {
        const hostId = script.resourceId.toString();
        const viaId = script._id.toString();

        // What it reads from -> the host
        for(const input of script.inputs) {
            const sourceId = input.resourceId.toString();
            const sourceType = await getType(sourceId);
            if(sourceId === hostId || !sourceType) continue;
            for(const kind of ['field', 'object'] as const) {
                for(const informationId of getEndIds(input, kind)) {
                    desired.push({ kind, informationId, sourceId, sourceType, targetId: hostId, targetType: script.resourceType, viaId });
                }
            }
        }

        // The host -> what it writes to
        for(const output of script.outputs) {
            const targetId = output.resourceId.toString();
            const targetType = await getType(targetId);
            if(targetId === hostId || !targetType) continue;
            const relation = { sourceId: hostId, sourceType: script.resourceType, targetId, targetType, viaId };

            if(targetType === 'table' && !output.componentId) {
                // A table gets the fields, also those inside a written object, as long as it still has the column
                const table = tables.find((table) => table._id.toString() === targetId);
                const columnIds = table?.columns.map((column) => column.informationFieldId.toString()) ?? [];
                const fieldIds = new Set([
                    ...getEndIds(output, 'field'),
                    ...getEndIds(output, 'object').flatMap((objectId) => objectFieldIds.get(objectId) ?? [])
                ]);
                for(const fieldId of fieldIds) {
                    if(columnIds.includes(fieldId)) desired.push({ ...relation, kind: 'field', informationId: fieldId });
                }
                continue;
            }

            const application = targetType === 'application' ? applications.find((application) => application._id.toString() === targetId) : undefined;
            for(const kind of ['field', 'object'] as const) {
                for(const informationId of getEndIds(output, kind)) {
                    // Taken out of the inputs of the application by hand: no longer written there
                    if(application && !(kind === 'field'
                        ? application.inputInformationFields.some((ref) => ref.informationFieldId.toString() === informationId)
                        : application.inputInformationObjects.some((ref) => ref.informationObjectId.toString() === informationId)
                    )) continue;
                    desired.push({ ...relation, kind, informationId });
                }
            }
        }
    }

    const managedScope = { environmentId, viaConnectionType: 'component' as const };
    const existing = [
        ...(await ResourceFieldRelation.find(managedScope)).map((relation) => ({ relation, kind: 'field' as const, informationId: relation.informationFieldId.toString() })),
        ...(await ResourceObjectRelation.find(managedScope)).map((relation) => ({ relation, kind: 'object' as const, informationId: relation.informationObjectId.toString() }))
    ].map(({ relation, kind, informationId }) => ({
        id: relation._id.toString(),
        kind,
        targetId: relation.targetResourceId.toString(),
        targetType: relation.targetResourceType,
        key: relationKey({ kind, informationId, sourceId: relation.sourceResourceId.toString(), targetId: relation.targetResourceId.toString() }),
        viaId: relation.viaConnectionId?.toString()
    }));

    // Relations through a script that no longer reads or writes the information there
    const desiredKeys = new Set(desired.map((relation) => `${relationKey(relation)}|${relation.viaId}`));
    const stale = existing.filter((relation) => !desiredKeys.has(`${relation.key}|${relation.viaId}`));
    const staleFieldIds = stale.filter((relation) => relation.kind === 'field').map((relation) => relation.id);
    const staleObjectIds = stale.filter((relation) => relation.kind === 'object').map((relation) => relation.id);
    if(staleFieldIds.length) await ResourceFieldRelation.deleteMany({ _id: { $in: staleFieldIds } });
    if(staleObjectIds.length) await ResourceObjectRelation.deleteMany({ _id: { $in: staleObjectIds } });
    const changedExternalIds = new Set(stale.filter((relation) => relation.targetType === 'external').map((relation) => relation.targetId));

    // New relations, unless there already is a relation between the two for this information through this script
    // or added another way (two scripts on the same host reading the same can share one relation)
    const kept = new Set(existing.filter((relation) => !stale.includes(relation)).map((relation) => relation.key));
    const present = await getPresentKeys(environmentId, desired.filter((relation) => !kept.has(relationKey(relation))));
    for(const relation of desired) {
        const key = relationKey(relation);
        if(kept.has(key) || present.has(key)) continue;
        present.add(key);

        const fields = {
            environmentId,
            sourceResourceId: relation.sourceId,
            sourceResourceType: relation.sourceType,
            targetResourceId: relation.targetId,
            targetResourceType: relation.targetType,
            viaConnectionType: 'component' as const,
            viaConnectionId: relation.viaId
        };
        if(relation.kind === 'field') {
            await ResourceFieldRelation.create({ ...fields, informationFieldId: relation.informationId });
        }
        else {
            await ResourceObjectRelation.create({ ...fields, informationObjectId: relation.informationId });
        }
        if(relation.targetType === 'external') changedExternalIds.add(relation.targetId);
    }

    // The received lists of external elements follow the relations to them
    for(const externalId of changedExternalIds) {
        await updateReceivedInformation(user, externalId);
    }
}

// Relations between the same resources for the same information, however they were added
async function getPresentKeys(environmentId: string, candidates: DesiredRelation[]) {
    const present = new Set<string>();
    if(!candidates.length) return present;

    const ends = {
        environmentId,
        sourceResourceId: { $in: candidates.map((relation) => relation.sourceId) },
        targetResourceId: { $in: candidates.map((relation) => relation.targetId) }
    };
    for(const relation of await ResourceFieldRelation.find(ends)) {
        present.add(relationKey({ kind: 'field', informationId: relation.informationFieldId.toString(), sourceId: relation.sourceResourceId.toString(), targetId: relation.targetResourceId.toString() }));
    }
    for(const relation of await ResourceObjectRelation.find(ends)) {
        present.add(relationKey({ kind: 'object', informationId: relation.informationObjectId.toString(), sourceId: relation.sourceResourceId.toString(), targetId: relation.targetResourceId.toString() }));
    }
    return present;
}
