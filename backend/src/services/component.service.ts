import { Types } from "mongoose";
import { UserJwtPayload } from "../middelware";
import Component, { COMPONENT_KINDS, ComponentKind, FILE_TYPES, IComponent, IComponentEnd, INFORMATION_SLOTS, InformationSlot } from "../models/component.model";
import ViewNode from "../models/canvas/viewNode.model";
import Application from "../models/resources/application.model";
import FileLocation from "../models/resources/fileLocation.model";
import Table from "../models/resources/table.model";
import InformationField from "../models/information/informationField.model";
import InformationObject from "../models/information/informationObject.models";
import { createInformationField } from "./resourceField.service";
import { createInformationObject } from "./resourceObject.service";
import { addScriptWrittenInput } from "./scriptRelation.service";

// Which kinds of component a resource can have: scripts run in applications and file locations,
// files are stored in file locations
const ALLOWED_KINDS: Record<'application' | 'fileLocation', ComponentKind[]> = {
    application: ['script'],
    fileLocation: ['script', 'file']
};

// The information fields and objects components refer to, so the frontend can resolve them
async function getReferencedInformation(user: UserJwtPayload, components: IComponent[]) {
    const informationObjects = await InformationObject.find({
        _id: {
            $in: components.flatMap((component) => [
                ...component.informationObjectIds,
                ...component.inputInformationObjectIds,
                ...component.outputInformationObjectIds
            ])
        },
        environmentId: user.environmentId
    });
    const informationFields = await InformationField.find({
        _id: {
            $in: [
                ...components.flatMap((component) => [
                    ...component.informationFieldIds,
                    ...component.inputInformationFieldIds,
                    ...component.outputInformationFieldIds
                ]),
                ...informationObjects.flatMap((object) => object.informationFieldIds)
            ]
        },
        environmentId: user.environmentId
    });
    return { informationFields, informationObjects };
}

async function withReferencedInformation(user: UserJwtPayload, component: IComponent | null) {
    if(!component) {
        throw new Error("Component not found");
    }
    const { informationFields, informationObjects } = await getReferencedInformation(user, [component]);
    return { component, informationFields, informationObjects };
}

async function getComponent(user: UserJwtPayload, componentId: string) {
    const component = await Component.findOne({ _id: componentId, environmentId: user.environmentId });
    if(!component) {
        throw new Error("Component not found");
    }
    return component;
}

export async function getComponents(user: UserJwtPayload) {
    const components = await Component.find({ environmentId: user.environmentId });
    const { informationFields, informationObjects } = await getReferencedInformation(user, components);
    return { components, informationFields, informationObjects };
}

// A new component gets its own node on the canvas, just below the resource it is part of
export async function createComponent(user: UserJwtPayload, body: any) {
    const kind = body.kind as ComponentKind;
    if(!COMPONENT_KINDS.includes(kind)) throw new Error("Unknown kind of component");
    if(!body.name?.trim()) throw new Error("A component needs a name");

    const application = await Application.findOne({ _id: body.resourceId, environmentId: user.environmentId });
    const fileLocation = application ? null : await FileLocation.findOne({ _id: body.resourceId, environmentId: user.environmentId });
    const resourceType = application ? 'application' : fileLocation ? 'fileLocation' : undefined;
    if(!resourceType) throw new Error("A component can only be part of an application or a file location");
    if(!ALLOWED_KINDS[resourceType].includes(kind)) {
        throw new Error(`A ${resourceType === 'application' ? 'application' : 'file location'} cannot have a ${kind}`);
    }

    const component = await new Component({
        environmentId: user.environmentId,
        kind,
        name: body.name.trim(),
        resourceId: body.resourceId,
        resourceType,
        fileType: FILE_TYPES.includes(body.fileType) ? body.fileType : 'other'
    }).save();

    const parentNode = await ViewNode.findOne({ environmentId: user.environmentId, entityId: body.resourceId });
    const siblings = await Component.countDocuments({ environmentId: user.environmentId, resourceId: body.resourceId });
    const viewNode = await new ViewNode({
        environmentId: user.environmentId,
        viewId: body.viewId ?? parentNode?.viewId,
        entityId: component._id,
        entityType: 'component',
        position: {
            x: (parentNode?.position.x ?? 0) + (siblings - 1) * 170,
            y: (parentNode?.position.y ?? 0) + 160
        }
    }).save();

    return { component, viewNode };
}

export async function updateComponent(user: UserJwtPayload, componentId: string, body: any) {
    // The ends and the information have their own functions
    const patch: Record<string, unknown> = {};
    if(body.name !== undefined) {
        if(!body.name.trim()) throw new Error("A component needs a name");
        patch.name = body.name.trim();
    }
    if(body.description !== undefined) patch.description = body.description;
    if(body.fileType !== undefined) {
        if(!FILE_TYPES.includes(body.fileType)) throw new Error("Unknown file type");
        patch.fileType = body.fileType;
    }

    const component = await Component.findOneAndUpdate(
        { _id: componentId, environmentId: user.environmentId },
        { $set: patch },
        { returnDocument: 'after' }
    );
    return withReferencedInformation(user, component);
}

export async function deleteComponent(user: UserJwtPayload, componentId: string) {
    const component = await getComponent(user, componentId);
    const viewNode = await ViewNode.findOneAndDelete({ environmentId: user.environmentId, entityId: componentId });
    await component.deleteOne();
    // Scripts that read from or wrote to this component (a file) no longer do, but stay connected to its file location
    if(component.kind === 'file') {
        await keepConnectionsWithoutPart(user, component.resourceId.toString(), { componentId });
    }
    return { componentId, viewNodeId: viewNode?._id };
}

// <-- What a script reads from and writes to -->

// A script connects to a resource. To a database or a file location it can connect without a known table or file, or
// with one or more of them. Every known table or file is an end of its own; the end of the database or file location
// itself is only there while none is known.

// The database of every table
async function getTableDatabases(user: UserJwtPayload) {
    const tables = await Table.find({ environmentId: user.environmentId });
    return new Map(tables.map((table) => [table._id.toString(), table.databaseId.toString()]));
}

// The resource the script is connected to through this end. A file end already has its file location as its resource
function getConnectionId(end: IComponentEnd, tableDatabases: Map<string, string>) {
    const resourceId = end.resourceId.toString();
    return tableDatabases.get(resourceId) ?? resourceId;
}

function createEnd(resourceId: string, componentId: string | null = null): IComponentEnd {
    return {
        resourceId: new Types.ObjectId(resourceId),
        componentId: componentId ? new Types.ObjectId(componentId) : null,
        informationFieldIds: [],
        informationObjectIds: []
    };
}

function keepConnection(component: IComponent, side: 'inputs' | 'outputs', connectionId: string, tableDatabases: Map<string, string>) {
    if(!component[side].some((end) => getConnectionId(end, tableDatabases) === connectionId)) {
        component[side].push(createEnd(connectionId));
    }
}

export async function addComponentEnd(user: UserJwtPayload, componentId: string, side: 'inputs' | 'outputs', end: { resourceId: string, componentId?: string | null }) {
    const component = await getComponent(user, componentId);
    if(component.kind !== 'script') throw new Error("Only a script reads from and writes to other resources");
    if(!end?.resourceId) throw new Error("Select what the script reads from or writes to");

    const endComponentId = end.componentId || null;
    const alreadyThere = component[side].some((existing) =>
        existing.resourceId.toString() === end.resourceId &&
        (existing.componentId?.toString() ?? null) === endComponentId
    );
    if(alreadyThere) return withReferencedInformation(user, component);

    const tableDatabases = await getTableDatabases(user);
    const newEnd = createEnd(end.resourceId, endComponentId);
    const connectionId = getConnectionId(newEnd, tableDatabases);
    const isTableOrFile = !!endComponentId || connectionId !== end.resourceId;

    if(!isTableOrFile && component[side].some((existing) => getConnectionId(existing, tableDatabases) === connectionId)) {
        return withReferencedInformation(user, component);
    }
    if(isTableOrFile) {
        // Now a table or file is known, the connection without one is no longer needed
        const unknownIndex = component[side].findIndex((existing) =>
            existing.resourceId.toString() === connectionId && !existing.componentId &&
            !existing.informationFieldIds.length && !existing.informationObjectIds.length
        );
        if(unknownIndex !== -1) component[side].splice(unknownIndex, 1);
    }

    component[side].push(newEnd);
    await component.save();
    return withReferencedInformation(user, component);
}

// The script stays connected to the database or file location when its last table or file is removed
export async function removeComponentEnd(user: UserJwtPayload, componentId: string, side: 'inputs' | 'outputs', index: number) {
    const component = await getComponent(user, componentId);
    const end = component[side][index];
    if(!end) throw new Error("The script no longer reads from or writes to this");

    const tableDatabases = await getTableDatabases(user);
    const connectionId = getConnectionId(end, tableDatabases);
    const isTableOrFile = !!end.componentId || connectionId !== end.resourceId.toString();

    component[side].splice(index, 1);
    if(isTableOrFile) keepConnection(component, side, connectionId, tableDatabases);
    await component.save();
    return withReferencedInformation(user, component);
}

// Removes the whole connection: the resource and every table or file of it
export async function removeComponentConnection(user: UserJwtPayload, componentId: string, side: 'inputs' | 'outputs', connectionId: string) {
    const component = await getComponent(user, componentId);
    const tableDatabases = await getTableDatabases(user);
    component[side] = component[side].filter((end) => getConnectionId(end, tableDatabases) !== connectionId);
    await component.save();
    return withReferencedInformation(user, component);
}

// A table or file was removed: scripts no longer read from or write to it, but stay connected to its database or
// file location. Only for a table or file on its own: when the parent is removed as well, the connection goes with it
export async function keepConnectionsWithoutPart(user: UserJwtPayload, parentId: string, part: { resourceId: string } | { componentId: string }) {
    const isPart = (end: IComponentEnd) => 'resourceId' in part
        ? end.resourceId.toString() === part.resourceId
        : end.componentId?.toString() === part.componentId;

    const tableDatabases = await getTableDatabases(user);
    const scripts = await Component.find({ environmentId: user.environmentId, kind: 'script' });
    for(const script of scripts) {
        if(![...script.inputs, ...script.outputs].some(isPart)) continue;
        for(const side of ['inputs', 'outputs'] as const) {
            if(!script[side].some(isPart)) continue;
            script[side] = script[side].filter((end) => !isPart(end));
            keepConnection(script, side, parentId, tableDatabases);
        }
        await script.save();
    }
}

// <-- The information a script reads from one end or writes to one end -->

// Reading puts the information in the inputs of the script, writing in its outputs
const SIDE_SLOTS = { inputs: 'input', outputs: 'output' } as const;

function hasId(ids: Types.ObjectId[], id: string) {
    return ids.some((existing) => existing.toString() === id.toString());
}

async function getInformationId(user: UserJwtPayload, type: 'Field' | 'Object', information: any) {
    if(type === 'Field') {
        if("fieldName" in information) {
            if(!information.fieldName?.trim()) throw new Error("A field needs a name");
            return (await createInformationField(user, information.fieldName.trim()))._id.toString();
        }
        return information.informationFieldId as string;
    }
    if("objectName" in information) {
        if(!information.objectName?.trim()) throw new Error("An object needs a name");
        return (await createInformationObject(user, information.objectName.trim()))._id.toString();
    }
    return information.informationObjectId as string;
}

async function getScriptEnd(user: UserJwtPayload, componentId: string, side: 'inputs' | 'outputs', index: number) {
    const component = await getComponent(user, componentId);
    if(component.kind !== 'script') throw new Error("Only a script reads from and writes to other resources");
    const end = component[side][index];
    if(!end) throw new Error("The script no longer reads from or writes to this");
    return { component, end };
}

// The information also goes in the inputs or outputs of the script
export async function addComponentEndInformation(user: UserJwtPayload, componentId: string, side: 'inputs' | 'outputs', index: number, type: 'Field' | 'Object', information: any) {
    const { component, end } = await getScriptEnd(user, componentId, side, index);
    if(!information) throw new Error("Select the information");
    const informationId = await getInformationId(user, type, information);

    const endList = end[`information${type}Ids`];
    if(!hasId(endList, informationId)) endList.push(new Types.ObjectId(informationId));
    const scriptList = component[`${SIDE_SLOTS[side]}Information${type}Ids`];
    if(!hasId(scriptList, informationId)) scriptList.push(new Types.ObjectId(informationId));

    await component.save();
    // What the script writes to gets the information directly: a file contains it, a resource takes it in
    // (its relation follows in syncScriptRelations)
    if(side === 'outputs' && end.componentId) {
        await Component.updateOne(
            { _id: end.componentId, environmentId: user.environmentId, kind: 'file' },
            { $addToSet: { [`information${type}Ids`]: new Types.ObjectId(informationId) } }
        );
    }
    else if(side === 'outputs') {
        await addScriptWrittenInput(user, end.resourceId.toString(), type === 'Field' ? 'field' : 'object', informationId);
    }
    return withReferencedInformation(user, component);
}

// The information stays in the inputs or outputs of the script while another end on that side still has it
export async function removeComponentEndInformation(user: UserJwtPayload, componentId: string, side: 'inputs' | 'outputs', index: number, type: 'Field' | 'Object', informationId: string) {
    const { component, end } = await getScriptEnd(user, componentId, side, index);
    const key = `information${type}Ids` as const;
    end[key] = end[key].filter((id) => id.toString() !== informationId);

    const stillUsed = component[side].some((other) => hasId(other[key], informationId));
    if(!stillUsed) {
        const scriptKey = `${SIDE_SLOTS[side]}Information${type}Ids` as const;
        component[scriptKey] = component[scriptKey].filter((id) => id.toString() !== informationId);
    }

    await component.save();
    return withReferencedInformation(user, component);
}

// <-- The information a script takes in and produces, or a file contains -->

// The ends of a script on the side of a slot: removing an input or output also removes it from what is read or written
function getEndPull(list: string, type: 'Field' | 'Object', id: string) {
    if(list.startsWith('input')) return { [`inputs.$[].information${type}Ids`]: id };
    if(list.startsWith('output')) return { [`outputs.$[].information${type}Ids`]: id };
    return {};
}

// The list a piece of information goes in. A script has inputs and outputs, a file only contains information
async function getInformationList(user: UserJwtPayload, componentId: string, slot: InformationSlot | undefined, type: 'Field' | 'Object') {
    const component = await getComponent(user, componentId);
    const usedSlot = slot ?? (component.kind === 'file' ? 'contains' : undefined);
    if(!usedSlot || !INFORMATION_SLOTS.includes(usedSlot)) throw new Error("Say whether the information is an input or an output");
    if(component.kind === 'file' && usedSlot !== 'contains') throw new Error("A file only contains information");
    if(component.kind === 'script' && usedSlot === 'contains') throw new Error("A script has input and output information");

    if(usedSlot === 'contains') return `information${type}Ids` as const;
    return `${usedSlot}Information${type}Ids` as const;
}

export async function addComponentInformationField(user: UserJwtPayload, componentId: string, information: { fieldName: string } | { informationFieldId: string }, slot?: InformationSlot) {
    const list = await getInformationList(user, componentId, slot, 'Field');
    let informationFieldId;
    if("fieldName" in information) {
        if(!information.fieldName?.trim()) throw new Error("A field needs a name");
        informationFieldId = (await createInformationField(user, information.fieldName.trim()))._id;
    }
    else {
        informationFieldId = information.informationFieldId;
    }

    const component = await Component.findOneAndUpdate(
        { _id: componentId, environmentId: user.environmentId },
        { $addToSet: { [list]: informationFieldId } },
        { returnDocument: 'after' }
    );
    return withReferencedInformation(user, component);
}

export async function removeComponentInformationField(user: UserJwtPayload, componentId: string, informationFieldId: string, slot?: InformationSlot) {
    const list = await getInformationList(user, componentId, slot, 'Field');
    const component = await Component.findOneAndUpdate(
        { _id: componentId, environmentId: user.environmentId },
        { $pull: { [list]: informationFieldId, ...getEndPull(list, 'Field', informationFieldId) } },
        { returnDocument: 'after' }
    );
    return withReferencedInformation(user, component);
}

export async function addComponentInformationObject(user: UserJwtPayload, componentId: string, information: { objectName: string } | { informationObjectId: string }, slot?: InformationSlot) {
    const list = await getInformationList(user, componentId, slot, 'Object');
    let informationObjectId;
    if("objectName" in information) {
        if(!information.objectName?.trim()) throw new Error("An object needs a name");
        informationObjectId = (await createInformationObject(user, information.objectName.trim()))._id;
    }
    else {
        informationObjectId = information.informationObjectId;
    }

    const component = await Component.findOneAndUpdate(
        { _id: componentId, environmentId: user.environmentId },
        { $addToSet: { [list]: informationObjectId } },
        { returnDocument: 'after' }
    );
    return withReferencedInformation(user, component);
}

export async function removeComponentInformationObject(user: UserJwtPayload, componentId: string, informationObjectId: string, slot?: InformationSlot) {
    const list = await getInformationList(user, componentId, slot, 'Object');
    const component = await Component.findOneAndUpdate(
        { _id: componentId, environmentId: user.environmentId },
        { $pull: { [list]: informationObjectId, ...getEndPull(list, 'Object', informationObjectId) } },
        { returnDocument: 'after' }
    );
    return withReferencedInformation(user, component);
}

// <-- Cleanup when resources are removed -->

// Removes what scripts read from or wrote to when those resources or components no longer exist
export async function removeComponentEndReferences(user: UserJwtPayload, resourceIds: string[], componentIds: string[] = []) {
    const removed = [
        ...resourceIds.map((resourceId) => ({ resourceId: new Types.ObjectId(resourceId) })),
        ...componentIds.map((componentId) => ({ componentId: new Types.ObjectId(componentId) }))
    ];
    if(!removed.length) return;

    for(const end of removed) {
        await Component.updateMany(
            { environmentId: user.environmentId },
            { $pull: { inputs: end, outputs: end } }
        );
    }
}

// The components of a removed resource are removed with it, including their nodes on the canvas
export async function removeResourceComponents(user: UserJwtPayload, resourceIds: string[]) {
    const components = await Component.find({ environmentId: user.environmentId, resourceId: { $in: resourceIds } });
    const componentIds = components.map((component) => component._id.toString());
    if(!componentIds.length) return;

    await ViewNode.deleteMany({ environmentId: user.environmentId, entityId: { $in: componentIds } });
    await Component.deleteMany({ environmentId: user.environmentId, resourceId: { $in: resourceIds } });
    await removeComponentEndReferences(user, [], componentIds);
}
