import { UserJwtPayload } from "../middelware";
import InformationField from "../models/information/informationField.model";
import InformationObject from "../models/information/informationObject.models";
import { IInformationSource, SourceResourceType } from "../models/information/informationSource.model";
import { getResourceType } from "./externalRelation.service";

// The source of a piece of information is a resource in the architecture. The type is looked up here,
// so the client only says which resource it is. null removes the source.
async function resolveSource(user: UserJwtPayload, resourceId: string | null): Promise<IInformationSource | null> {
    if(resourceId === null) return null;

    const resourceType = await getResourceType(user, resourceId);
    if(!resourceType) throw new Error("The source must be a resource in this environment");

    return { resourceId: resourceId as any, resourceType: resourceType as SourceResourceType };
}

export async function setInformationFieldSource(user: UserJwtPayload, informationFieldId: string, resourceId: string | null) {
    const source = await resolveSource(user, resourceId);
    const informationField = await InformationField.findOneAndUpdate(
        { _id: informationFieldId, environmentId: user.environmentId },
        { $set: { source } },
        { returnDocument: 'after' }
    );
    if(!informationField) throw new Error("Information field not found");
    return informationField;
}

export async function setInformationObjectSource(user: UserJwtPayload, informationObjectId: string, resourceId: string | null) {
    const source = await resolveSource(user, resourceId);
    const informationObject = await InformationObject.findOneAndUpdate(
        { _id: informationObjectId, environmentId: user.environmentId },
        { $set: { source } },
        { returnDocument: 'after' }
    );
    if(!informationObject) throw new Error("Information object not found");
    return informationObject;
}
