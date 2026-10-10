import { UserJwtPayload } from "../middelware";
import Api from "../models/api.model";
import Application, { IApplication } from "../models/resources/application.model";
import External from "../models/resources/external.model";
import InformationObject from "../models/information/informationObject.models";
import OtherConnection from "../models/otherConnection.model";
import { syncOtherConnectionRelations } from "./externalRelation.service";

// An api belongs to an application or to an external element (its applicationId is the id of the owner).
// Only what the owner passes on can be sent through the api:
// - an application: its output fields and objects, and the fields inside its output objects
// - an external element: the fields and objects it provides, and the fields inside its provided objects
async function getApiSendableInformation(user: UserJwtPayload, apiId: string) {
    const api = await Api.findOne({
        _id: apiId,
        organisationId: user.organisationId
    });
    if(!api) {
        throw new Error("Api not found");
    }

    const application = await Application.findOne({
        _id: api.applicationId,
        organisationId: user.organisationId
    });
    if(application) {
        return {
            fieldIds: await getSendableFieldIds(user, application),
            objectIds: new Set(application.outputInformationObjects.map((object) => object.informationObjectId.toString())),
            ownerDescription: 'output information of the application'
        };
    }

    const external = await External.findOne({
        _id: api.applicationId,
        organisationId: user.organisationId
    });
    if(external) {
        const providedObjects = await InformationObject.find({
            _id: { $in: external.providedInformationObjects.map((object) => object.informationObjectId) },
            organisationId: user.organisationId
        });
        return {
            fieldIds: new Set([
                ...external.providedInformationFields.map((field) => field.informationFieldId.toString()),
                ...providedObjects.flatMap((object) => object.informationFieldIds.map((fieldId) => fieldId.toString()))
            ]),
            objectIds: new Set(external.providedInformationObjects.map((object) => object.informationObjectId.toString())),
            ownerDescription: 'information the external element provides'
        };
    }

    throw new Error("Owner of the api not found");
}

// The fields an application can send through its apis: its standalone output fields
// and the fields that are part of its output objects
export async function getSendableFieldIds(user: UserJwtPayload, application: IApplication): Promise<Set<string>> {
    const outputObjects = await InformationObject.find({
        _id: { $in: application.outputInformationObjects.map((object) => object.informationObjectId) },
        organisationId: user.organisationId
    });

    return new Set([
        ...application.outputInformationFields.map((field) => field.informationFieldId.toString()),
        ...outputObjects.flatMap((object) => object.informationFieldIds.map((fieldId) => fieldId.toString()))
    ]);
}

// Removes everything from the apis and other connections of the application that the application can no longer send
export async function cleanupApplicationApis(user: UserJwtPayload, applicationId: string) {
    const application = await Application.findOne({
        _id: applicationId,
        organisationId: user.organisationId
    });
    if(!application) return;

    const sendableFieldIds = await getSendableFieldIds(user, application);
    const outputObjectIds = application.outputInformationObjects.map((object) => object.informationObjectId.toString());

    const apis = await Api.find({
        organisationId: user.organisationId,
        applicationId: applicationId
    });
    for(const api of apis) {
        await Api.updateOne(
            { _id: api._id },
            {
                $pull: {
                    informationFieldIds: { $in: api.informationFieldIds.filter((fieldId) => !sendableFieldIds.has(fieldId.toString())) },
                    informationObjectIds: { $in: api.informationObjectIds.filter((objectId) => !outputObjectIds.includes(objectId.toString())) }
                }
            }
        );
    }

    // Other connections from the application can only carry what the application outputs as well
    const otherConnections = await OtherConnection.find({
        organisationId: user.organisationId,
        sourceId: applicationId
    });
    for(const otherConnection of otherConnections) {
        await OtherConnection.updateOne(
            { _id: otherConnection._id },
            {
                $pull: {
                    informationFieldIds: { $in: otherConnection.informationFieldIds.filter((fieldId) => !sendableFieldIds.has(fieldId.toString())) },
                    informationObjectIds: { $in: otherConnection.informationObjectIds.filter((objectId) => !outputObjectIds.includes(objectId.toString())) }
                }
            }
        );
        // An external element no longer receives what the connection stopped carrying
        await syncOtherConnectionRelations(user, otherConnection._id.toString());
    }
}

// An InformationObject changed, so every application that outputs it might no longer be able to send some fields
export async function cleanupApisForInformationObject(user: UserJwtPayload, informationObjectId: string) {
    const applications = await Application.find({
        organisationId: user.organisationId,
        'outputInformationObjects.informationObjectId': informationObjectId
    });
    for(const application of applications) {
        await cleanupApplicationApis(user, application._id.toString());
    }
}

export async function addApiInformationField(user: UserJwtPayload, apiId: string, informationFieldId: string) {
    const sendable = await getApiSendableInformation(user, apiId);
    if(!sendable.fieldIds.has(informationFieldId)) {
        throw new Error(`Only ${sendable.ownerDescription} can be sent through its api`);
    }

    return await Api.findOneAndUpdate(
        {
            _id: apiId,
            organisationId: user.organisationId
        },
        {
            $addToSet: { informationFieldIds: informationFieldId }
        },
        {
            returnDocument: 'after'
        }
    );
}

export async function removeApiInformationField(user: UserJwtPayload, apiId: string, informationFieldId: string) {
    const api = await Api.findOneAndUpdate(
        {
            _id: apiId,
            organisationId: user.organisationId
        },
        {
            $pull: { informationFieldIds: informationFieldId }
        },
        {
            returnDocument: 'after'
        }
    );
    if(!api) {
        throw new Error("Api not found");
    }
    return api;
}

export async function addApiInformationObject(user: UserJwtPayload, apiId: string, informationObjectId: string) {
    const sendable = await getApiSendableInformation(user, apiId);
    if(!sendable.objectIds.has(informationObjectId)) {
        throw new Error(`Only ${sendable.ownerDescription} can be sent through its api`);
    }

    return await Api.findOneAndUpdate(
        {
            _id: apiId,
            organisationId: user.organisationId
        },
        {
            $addToSet: { informationObjectIds: informationObjectId }
        },
        {
            returnDocument: 'after'
        }
    );
}

export async function removeApiInformationObject(user: UserJwtPayload, apiId: string, informationObjectId: string) {
    const api = await Api.findOneAndUpdate(
        {
            _id: apiId,
            organisationId: user.organisationId
        },
        {
            $pull: { informationObjectIds: informationObjectId }
        },
        {
            returnDocument: 'after'
        }
    );
    if(!api) {
        throw new Error("Api not found");
    }
    return api;
}
