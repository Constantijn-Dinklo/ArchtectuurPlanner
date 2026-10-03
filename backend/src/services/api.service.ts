import { UserJwtPayload } from "../middelware";
import Api from "../models/api.model";
import Application, { IApplication } from "../models/resources/application.model";
import InformationObject from "../models/information/informationObject.models";

// Only the output information of the application the api belongs to can be sent through the api
async function getApiWithApplication(user: UserJwtPayload, apiId: string) {
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
    if(!application) {
        throw new Error("Application of the api not found");
    }

    return { api, application };
}

// The fields an application can send through its apis: its standalone output fields
// and the fields that are part of its output objects
async function getSendableFieldIds(user: UserJwtPayload, application: IApplication): Promise<Set<string>> {
    const outputObjects = await InformationObject.find({
        _id: { $in: application.outputInformationObjects.map((object) => object.informationObjectId) },
        organisationId: user.organisationId
    });

    return new Set([
        ...application.outputInformationFields.map((field) => field.informationFieldId.toString()),
        ...outputObjects.flatMap((object) => object.informationFieldIds.map((fieldId) => fieldId.toString()))
    ]);
}

// Removes everything from the apis of the application that the application can no longer send
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
    const { application } = await getApiWithApplication(user, apiId);

    const sendableFieldIds = await getSendableFieldIds(user, application);
    if(!sendableFieldIds.has(informationFieldId)) {
        throw new Error("Only output information fields of the application can be sent through its api");
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
    const { application } = await getApiWithApplication(user, apiId);

    const isOutputObject = application.outputInformationObjects.some(
        (object) => object.informationObjectId.toString() === informationObjectId
    );
    if(!isOutputObject) {
        throw new Error("Only output information objects of the application can be sent through its api");
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
