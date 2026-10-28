import { Types } from "mongoose";
import { UserJwtPayload } from "../middelware";
import Component, { COMPONENT_KINDS, ComponentKind, FILE_TYPES, IComponent, INFORMATION_SLOTS, InformationSlot } from "../models/component.model";
import ViewNode from "../models/canvas/viewNode.model";
import Application from "../models/resources/application.model";
import FileLocation from "../models/resources/fileLocation.model";
import InformationField from "../models/information/informationField.model";
import InformationObject from "../models/information/informationObject.models";
import { createInformationField } from "./resourceField.service";
import { createInformationObject } from "./resourceObject.service";

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
    // Scripts that read from or wrote to this component (a file) no longer do
    await removeComponentEndReferences(user, [], [componentId]);
    return { componentId, viewNodeId: viewNode?._id };
}

// <-- What a script reads from and writes to -->

export async function addComponentEnd(user: UserJwtPayload, componentId: string, side: 'inputs' | 'outputs', end: { resourceId: string, componentId?: string | null }) {
    const component = await getComponent(user, componentId);
    if(component.kind !== 'script') throw new Error("Only a script reads from and writes to other resources");
    if(!end?.resourceId) throw new Error("Select what the script reads from or writes to");

    const endComponentId = end.componentId || null;
    const alreadyThere = component[side].some((existing) =>
        existing.resourceId.toString() === end.resourceId &&
        (existing.componentId?.toString() ?? null) === endComponentId
    );
    if(!alreadyThere) {
        component[side].push({
            resourceId: new Types.ObjectId(end.resourceId),
            componentId: endComponentId ? new Types.ObjectId(endComponentId) : null
        });
        await component.save();
    }
    return withReferencedInformation(user, component);
}

export async function removeComponentEnd(user: UserJwtPayload, componentId: string, side: 'inputs' | 'outputs', index: number) {
    const component = await getComponent(user, componentId);
    component[side].splice(index, 1);
    await component.save();
    return withReferencedInformation(user, component);
}

// <-- The information a script takes in and produces, or a file contains -->

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
        { $pull: { [list]: informationFieldId } },
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
        { $pull: { [list]: informationObjectId } },
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
