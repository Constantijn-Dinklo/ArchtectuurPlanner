import { UserJwtPayload } from "../middelware";
import Component from "../models/component.model";
import InformationField from "../models/information/informationField.model";
import InformationObject from "../models/information/informationObject.models";
import { IInformationSource, SOURCE_METHODS, SourceMethod, SourceResourceType } from "../models/information/informationSource.model";
import Application from "../models/resources/application.model";
import External from "../models/resources/external.model";
import { getResourceType } from "./externalRelation.service";
import { addTableInformation } from "./table.service";

// What the client picks as a source: a resource, or a file in a file location. null removes the source
export type SourceTarget = { resourceId: string, componentId?: string | null } | null;

// Information lives in applications, external elements, tables and files. The type is looked up here,
// so the client only says which one it is. A database or file location has that through its tables and files.
async function resolveSource(user: UserJwtPayload, target: SourceTarget): Promise<IInformationSource | null> {
    if(!target) return null;

    if(target.componentId) {
        const file = await Component.findOne({ _id: target.componentId, environmentId: user.environmentId, kind: 'file' });
        if(!file) throw new Error("The source must be a file in this environment");
        return { resourceId: file.resourceId, resourceType: 'fileLocation', componentId: file._id as any };
    }

    const resourceType = await getResourceType(user, target.resourceId);
    if(resourceType !== 'application' && resourceType !== 'table' && resourceType !== 'external') {
        throw new Error("The source must be an application, external element, table or file");
    }
    return { resourceId: target.resourceId as any, resourceType: resourceType as SourceResourceType, componentId: null };
}

// The source is a place the information lives, so it gets the information: an application outputs it,
// an external element provides it, a table has a column for it and a file contains it.
// What is already there stays as it is, and a place keeps the information when the source changes later
async function addSourceLocation(user: UserJwtPayload, source: IInformationSource, kind: 'field' | 'object', informationId: string) {
    const resource = { _id: source.resourceId, environmentId: user.environmentId };
    const idKey = kind === 'field' ? 'informationFieldId' : 'informationObjectId';
    const type = kind === 'field' ? 'Fields' : 'Objects';

    if(source.componentId) {
        await Component.updateOne(
            { _id: source.componentId, environmentId: user.environmentId },
            { $addToSet: { [kind === 'field' ? 'informationFieldIds' : 'informationObjectIds']: informationId } }
        );
    }
    else if(source.resourceType === 'application') {
        const list = `outputInformation${type}`;
        await Application.updateOne(
            { ...resource, [`${list}.${idKey}`]: { $ne: informationId } },
            { $push: { [list]: { [idKey]: informationId, position: 0 } } }
        );
    }
    else if(source.resourceType === 'external') {
        const list = `providedInformation${type}`;
        await External.updateOne(
            { ...resource, [`${list}.${idKey}`]: { $ne: informationId } },
            { $push: { [list]: { [idKey]: informationId, position: 0 } } }
        );
    }
    else if(source.resourceType === 'table') {
        await addTableInformation(user, source.resourceId.toString(), kind, informationId);
    }
}

export async function setInformationFieldSource(user: UserJwtPayload, informationFieldId: string, target: SourceTarget) {
    const source = await resolveSource(user, target);
    const informationField = await InformationField.findOneAndUpdate(
        { _id: informationFieldId, environmentId: user.environmentId },
        { $set: { source } },
        { returnDocument: 'after' }
    );
    if(!informationField) throw new Error("Information field not found");
    if(source) await addSourceLocation(user, source, 'field', informationFieldId);
    return informationField;
}

export async function setInformationObjectSource(user: UserJwtPayload, informationObjectId: string, target: SourceTarget) {
    const source = await resolveSource(user, target);
    const informationObject = await InformationObject.findOneAndUpdate(
        { _id: informationObjectId, environmentId: user.environmentId },
        { $set: { source } },
        { returnDocument: 'after' }
    );
    if(!informationObject) throw new Error("Information object not found");
    if(source) await addSourceLocation(user, source, 'object', informationObjectId);
    return informationObject;
}

// null removes the method
function checkSourceMethod(sourceMethod: SourceMethod | null) {
    if(sourceMethod !== null && !SOURCE_METHODS.includes(sourceMethod)) throw new Error("Unknown source method");
}

export async function setInformationFieldSourceMethod(user: UserJwtPayload, informationFieldId: string, sourceMethod: SourceMethod | null) {
    checkSourceMethod(sourceMethod);
    const informationField = await InformationField.findOneAndUpdate(
        { _id: informationFieldId, environmentId: user.environmentId },
        { $set: { sourceMethod } },
        { returnDocument: 'after' }
    );
    if(!informationField) throw new Error("Information field not found");
    return informationField;
}

export async function setInformationObjectSourceMethod(user: UserJwtPayload, informationObjectId: string, sourceMethod: SourceMethod | null) {
    checkSourceMethod(sourceMethod);
    const informationObject = await InformationObject.findOneAndUpdate(
        { _id: informationObjectId, environmentId: user.environmentId },
        { $set: { sourceMethod } },
        { returnDocument: 'after' }
    );
    if(!informationObject) throw new Error("Information object not found");
    return informationObject;
}
