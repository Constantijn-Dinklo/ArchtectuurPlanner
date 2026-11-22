import { UserJwtPayload } from "../middelware";
import Component, { COMPONENT_KINDS, ComponentKind, ComponentResourceType, FILE_TYPES, IComponent, INFORMATION_SLOTS, InformationSlot } from "../models/component.model";
import ViewNode from "../models/canvas/viewNode.model";
import Application from "../models/resources/application.model";
import FileLocation from "../models/resources/fileLocation.model";
import Database from "../models/resources/database.model";
import InformationField from "../models/information/informationField.model";
import InformationObject from "../models/information/informationObject.models";
import { createInformationField } from "./resourceField.service";
import { createInformationObject } from "./resourceObject.service";
import ResourceFieldRelation from "../models/information/resourceFieldRelation.model";
import ResourceObjectRelation from "../models/information/resourceObjectRelation.model";
import { createRelation } from "./informationRelation.service";
import { removeResourceRelations } from "./externalRelation.service";

// Which kinds of component a resource can have: scripts run in applications and file locations, files are stored in
// file locations, tables are always part of a database
const ALLOWED_KINDS: Record<ComponentResourceType, ComponentKind[]> = {
    application: ['script'],
    fileLocation: ['script', 'file'],
    database: ['table']
};

const RESOURCE_NAMES: Record<ComponentResourceType, string> = {
    application: 'An application',
    fileLocation: 'A file location',
    database: 'A database'
};

// What the component will be part of
async function getComponentResourceType(user: UserJwtPayload, resourceId: string): Promise<ComponentResourceType | undefined> {
    const filter = { _id: resourceId, environmentId: user.environmentId };
    if(await Application.exists(filter)) return 'application';
    if(await FileLocation.exists(filter)) return 'fileLocation';
    if(await Database.exists(filter)) return 'database';
    return undefined;
}

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

    const resourceType = await getComponentResourceType(user, body.resourceId);
    if(!resourceType) throw new Error("A component can only be part of an application, a file location or a database");
    if(!ALLOWED_KINDS[resourceType].includes(kind)) {
        throw new Error(`${RESOURCE_NAMES[resourceType]} cannot have a ${kind}`);
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
    if(component.kind === 'file') {
        // Information that had the file as its source has no source anymore
        const sourcedHere = { environmentId: user.environmentId, 'source.componentId': componentId };
        await InformationField.updateMany(sourcedHere, { $set: { source: null } });
        await InformationObject.updateMany(sourcedHere, { $set: { source: null } });
    }
    // A component is the end of relations (and a script of connections), which go with it. What is connected to the
    // database of a table or the file location of a file stays connected to it
    await removeResourceRelations(user, [componentId]);
    return { componentId, viewNodeId: viewNode?._id };
}

// <-- The information a script takes in and produces, or a file contains -->

// The list a piece of information goes in. A script has inputs and outputs, a file only contains information, a table
// only contains fields (its columns)
async function getInformationList(user: UserJwtPayload, componentId: string, slot: InformationSlot | undefined, type: 'Field' | 'Object') {
    const component = await getComponent(user, componentId);
    const usedSlot = slot ?? (component.kind !== 'script' ? 'contains' : undefined);
    if(!usedSlot || !INFORMATION_SLOTS.includes(usedSlot)) throw new Error("Say whether the information is an input or an output");
    if(component.kind !== 'script' && usedSlot !== 'contains') throw new Error(`A ${component.kind} only contains information`);
    if(component.kind === 'table' && type === 'Object') throw new Error("A table only has fields: add the fields of the object as columns");
    if(component.kind === 'script' && usedSlot === 'contains') throw new Error("A script has input and output information");

    if(usedSlot === 'contains') return `information${type}Ids` as const;
    return `${usedSlot}Information${type}Ids` as const;
}

// A field that comes from somewhere else (sourceResourceId) also gets the relation from there to the component; for now
// only for a table: a column that is filled from another resource
type ComponentFieldToAdd =
    | { fieldName: string }
    | { informationFieldId: string, sourceResourceId?: string, connectionId?: string | null };

export async function addComponentInformationField(user: UserJwtPayload, componentId: string, information: ComponentFieldToAdd, slot?: InformationSlot) {
    const list = await getInformationList(user, componentId, slot, 'Field');
    let informationFieldId;
    if("fieldName" in information) {
        if(!information.fieldName?.trim()) throw new Error("A field needs a name");
        informationFieldId = (await createInformationField(user, information.fieldName.trim()))._id;
    }
    else {
        informationFieldId = information.informationFieldId;
        if(information.sourceResourceId) {
            const component = await getComponent(user, componentId);
            if(component.kind !== 'table') throw new Error("Only a table takes in a field from another resource");
            await createRelation(user, {
                kind: 'field',
                informationId: informationFieldId,
                sourceResourceId: information.sourceResourceId,
                targetResourceId: componentId,
                connectionId: information.connectionId ?? null
            });
        }
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
        { $pull: { [list]: informationFieldId } },
        { returnDocument: 'after' }
    );
    await removeSlotRelations(user, componentId, list, 'Field', informationFieldId);
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
        { $pull: { [list]: informationObjectId } },
        { returnDocument: 'after' }
    );
    await removeSlotRelations(user, componentId, list, 'Object', informationObjectId);
    return withReferencedInformation(user, component);
}

// Like an application: a script that no longer takes the information in no longer receives it, and one that no
// longer produces it no longer sends it on. The connections stay
async function removeSlotRelations(user: UserJwtPayload, componentId: string, list: string, type: 'Field' | 'Object', informationId: string) {
    const end = list.startsWith('input') ? 'targetResourceId' : list.startsWith('output') ? 'sourceResourceId' : undefined;
    if(!end) return;
    const Model = (type === 'Field' ? ResourceFieldRelation : ResourceObjectRelation) as typeof ResourceFieldRelation;
    await Model.deleteMany({ environmentId: user.environmentId, [`information${type}Id`]: informationId, [end]: componentId });
}

// <-- Cleanup when resources are removed -->

// The ids of the components of the resources
export async function getResourceComponentIds(user: UserJwtPayload, resourceIds: string[]) {
    const components = await Component.find({ environmentId: user.environmentId, resourceId: { $in: resourceIds } });
    return components.map((component) => component._id.toString());
}

// The components of a removed resource are removed with it, including their nodes on the canvas. Their connections and
// relations are removed with those of the resource
export async function removeResourceComponents(user: UserJwtPayload, resourceIds: string[]) {
    const componentIds = await getResourceComponentIds(user, resourceIds);
    if(!componentIds.length) return;

    await ViewNode.deleteMany({ environmentId: user.environmentId, entityId: { $in: componentIds } });
    await Component.deleteMany({ environmentId: user.environmentId, resourceId: { $in: resourceIds } });
}
