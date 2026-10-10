import { UserJwtPayload } from "../middelware";
import ApiConnection from "../models/apiConnection.model";
import ViewNode from "../models/canvas/viewNode.model";
import { createInformationField, ResourceFieldInformation } from "./resourceField.service";
import Application from "../models/resources/application.model";
import ResourceFieldRelation from "../models/information/resourceFieldRelation.model";
import ResourceObjectRelation from "../models/information/resourceObjectRelation.model";
import { cleanupApplicationApis } from "./api.service";
import { removeResourceRelations } from "./externalRelation.service";
import { createInformationObject, resourceObjectInformation } from "./resourceObject.service";
import InformationField from "../models/information/informationField.model";
import InformationObject from "../models/information/informationObject.models";


export async function getApplications(user: UserJwtPayload) {
    const applications = await Application.find({
        organisationId: user.organisationId
    });

    const informationObjectIds = applications.flatMap(
                                    (application) => [
                                        ...application.inputInformationObjects,
                                        ...application.outputInformationObjects
                                    ].map(
                                        (informationObject) => informationObject.informationObjectId
                                    )
                                );

    const informationObjects = await InformationObject.find({
        _id: { $in: informationObjectIds },
        organisationId: user.organisationId
    });
    
    const informationFieldIds = new Set<string>();

    informationObjects
        .flatMap(informationObject => informationObject.informationFieldIds)
        .forEach(informationFieldId =>
            informationFieldIds.add(informationFieldId.toString())
        );
    
    for (const application of applications) {
        for (const field of application.inputInformationFields) {
            informationFieldIds.add(field.informationFieldId.toString());
        }

        for (const field of application.outputInformationFields) {
            informationFieldIds.add(field.informationFieldId.toString());
        }
    }

    const informationFields = await InformationField.find({
        _id: {
            $in: [...informationFieldIds]
        },
        organisationId: user.organisationId
    });

    return {
        applications,
        informationObjects,
        informationFields
    };
}

export async function createAppliction(user: UserJwtPayload, name: string, viewId: string) {
    try {
        const applicationBody = {
            organisationId: user.organisationId,
            name: name,
        }
        const application = new Application(applicationBody);
        await application.save();

        const nodeBody = {
            organisationId: user.organisationId,
            viewId: viewId,
            entityId: application._id,
            entityType: 'application',
            position: {
                x: Math.random() * 400,
                y: Math.random() * 400
            }
        }
        const viewNode = new ViewNode(nodeBody);
        await viewNode.save();

        return {
            application,
            viewNode
        };
    }
    catch(err: any) {
        throw new Error(err.message);
    }
}

export async function deleteApplication(user: UserJwtPayload, resourceId: string) {
    
    try {
        const result = await canApplicationBeRemoved(user, resourceId);
        if(!result.success) return result;

        const deletedNode = await ViewNode.findOneAndDelete({
            organisationId: user.organisationId,
            entityId: resourceId
        });

        const deleted = await Application.findOneAndDelete({
            _id: resourceId,
            organisationId: user.organisationId
        });

        if (!deleted || !deletedNode) {
            return {
                status: 403,
                success: false,
                message: 'The Application was not deleted correctly.',
            }
        }
        await removeResourceRelations(user, [resourceId]);
        return {
            status: 200,
            success: true,
            message: 'Application deleted successfully',
            resourceId: deleted._id,
            viewNodeId: deletedNode._id
        }
    }
    catch(err: any) {
        throw new Error(err.message);
    }
}

// <-- Information Fields -->
export async function addApplicationInputInformationField(user: UserJwtPayload, applicationId: string, resourceFieldInformation: ResourceFieldInformation) {
    //TODO: first check if the informationField already exists in the application

    let informationFieldId = undefined;
    let informationField = undefined;
    let position = 0;
    if("fieldName" in resourceFieldInformation){
        informationField = await createInformationField(user, resourceFieldInformation.fieldName);
        informationFieldId = informationField._id;
    }
    else {
        const newResourceFieldRelation = await new ResourceFieldRelation({
            organisationId: user.organisationId,
            informationFieldId: resourceFieldInformation.informationFieldId,
            sourceResourceId: resourceFieldInformation.sourceResourceId,
            sourceResourceType: resourceFieldInformation.sourceResourceType,
            targetResourceId: applicationId,
            targetResourceType: 'application',
            viaConnectionType: resourceFieldInformation.viaConnectionType ?? null,
            viaConnectionId: resourceFieldInformation.viaConnectionType ? resourceFieldInformation.viaConnectionId ?? null : null
        });
        newResourceFieldRelation.save();

        informationFieldId = resourceFieldInformation.informationFieldId;
        informationField = await InformationField.findOne({
            organisationId: user.organisationId,
            _id: informationFieldId
        });
        position = 1;
    }
    const application = await Application.findOneAndUpdate(
        {
            _id: applicationId,
            organisationId: user.organisationId,
        },
        {
            $push: {
                inputInformationFields: {
                    informationFieldId: informationFieldId,
                    position: position,
                }
            }
        },
        {
            returnDocument: 'after'
        }
    );
    if(!application) { 
        return {
            status: 400,
            success: false,
            message: "Application not found" 
        }
    }
    return {
        application,
        informationFields: [informationField]
    };
}

export async function deleteApplicationInputInformationField(user: UserJwtPayload, applicationId: string, informationFieldId: string) {


    const application = await Application.findOneAndUpdate(
    {
        _id: applicationId,
        organisationId: user.organisationId,
    },
    {
        $pull: {
            inputInformationFields: {
                informationFieldId: informationFieldId
            }
        }
    },
    {
        returnDocument: 'after'
    });
    if(!application) { 
        return {
            status: 400,
            success: false,
            message: "Application not found" 
        }
    }
    // Removes the direct relations of the input: source -> application (input)
    // and application (input) -> application (output). application (output) -> other resource is kept.
    await ResourceFieldRelation.deleteMany({
        organisationId: user.organisationId,
        informationFieldId: informationFieldId,
        targetResourceId: applicationId,
        targetResourceType: 'application'
    });
    return application;
}

export async function addApplicationOutputInformationField(user: UserJwtPayload, applicationId: string, resourceFieldInformation: ResourceFieldInformation) {
    
    let informationFieldId = undefined;
    let informationField = undefined;
    let position = 0;
    if("fieldName" in resourceFieldInformation){
        //Create new Information Field
        informationField = await createInformationField(user, resourceFieldInformation.fieldName);
        informationFieldId = informationField._id;
    }
    else {
        // Add a new ResourceFieldRelation
        const newResourceFieldRelation = await new ResourceFieldRelation({
            organisationId: user.organisationId,
            informationFieldId: resourceFieldInformation.informationFieldId,
            sourceResourceId: resourceFieldInformation.sourceResourceId,
            sourceResourceType: resourceFieldInformation.sourceResourceType,
            targetResourceId: applicationId,
            targetResourceType: 'application',
            viaConnectionType: resourceFieldInformation.viaConnectionType ?? null,
            viaConnectionId: resourceFieldInformation.viaConnectionType ? resourceFieldInformation.viaConnectionId ?? null : null
        });
        newResourceFieldRelation.save();

        informationFieldId = resourceFieldInformation.informationFieldId;
        informationField = await InformationField.findOne({
            organisationId: user.organisationId,
            _id: informationFieldId
        });
        position = 1;
    }
    const application = await Application.findOneAndUpdate(
        {
            _id: applicationId,
            organisationId: user.organisationId,
        },
        {
            $push: {
                outputInformationFields: {
                    informationFieldId: informationFieldId,
                    position: position,
                }
            }
        },
        {
            returnDocument: 'after'
        }
    );
    if(!application) { 
        return {
            status: 400,
            success: false,
            message: "Application not found" 
        }
    }

    return {
        application,
        informationFields: [informationField]
    };
}

export async function deleteApplicationOutputInformationField(user: UserJwtPayload, applicationId: string, informationFieldId: string) {


    const application = await Application.findOneAndUpdate(
        {
            _id: applicationId,
            organisationId: user.organisationId,
        },
        {
            $pull: {
                outputInformationFields: {
                    informationFieldId: informationFieldId
                }
            }
        },
        {
            returnDocument: 'after'
        }
    );
    if(!application) { 
        return {
            status: 400,
            success: false,
            message: "Application not found" 
        }
    }
    // Removes the direct relations of the output: application (input) -> application (output)
    // and application (output) -> other resource. source -> application (input) is kept.
    await ResourceFieldRelation.deleteMany(
        {
            organisationId: user.organisationId,
            informationFieldId: informationFieldId,
            sourceResourceId: applicationId,
            sourceResourceType: 'application'
        }
    )
    // The field can no longer be sent through the apis of the application, unless it is still part of an output object
    await cleanupApplicationApis(user, applicationId);
    return application;
}

// Only removes the standalone informationField from the application.
// The ResourceFieldRelations are left untouched, since the field still lives on in an InformationObject.
export async function moveApplicationInformationFieldToInformationObject(user: UserJwtPayload, applicationId: string, informationFieldId: string, direction: 'input' | 'output') {
    const fieldList = direction === 'input' ? 'inputInformationFields' : 'outputInformationFields';

    const application = await Application.findOneAndUpdate(
        {
            _id: applicationId,
            organisationId: user.organisationId,
        },
        {
            $pull: {
                [fieldList]: {
                    informationFieldId: informationFieldId
                }
            }
        },
        {
            returnDocument: 'after'
        }
    );
    if(!application) {
        throw new Error("Application not found");
    }
    return application;
}

// Puts an informationField that was removed from an InformationObject back in the standalone list of the application.
// The ResourceFieldRelations are left untouched; they are only used to decide if the field is connected or local.
export async function moveInformationFieldFromInformationObjectToApplication(user: UserJwtPayload, applicationId: string, informationFieldId: string, direction: 'input' | 'output') {
    const fieldList = direction === 'input' ? 'inputInformationFields' : 'outputInformationFields';

    const resourceFieldRelation = await ResourceFieldRelation.findOne({
        organisationId: user.organisationId,
        informationFieldId: informationFieldId,
        targetResourceId: applicationId,
        targetResourceType: 'application'
    });

    const application = await Application.findOneAndUpdate(
        {
            _id: applicationId,
            organisationId: user.organisationId,
            // Do not add the field a second time
            [`${fieldList}.informationFieldId`]: { $ne: informationFieldId }
        },
        {
            $push: {
                [fieldList]: {
                    informationFieldId: informationFieldId,
                    position: resourceFieldRelation ? 1 : 0,
                }
            }
        },
        {
            returnDocument: 'after'
        }
    ) ?? await Application.findOne({
        _id: applicationId,
        organisationId: user.organisationId,
    });
    if(!application) {
        throw new Error("Application not found");
    }
    return application;
}

// <-- Information Object -->
export async function addApplicationInputInformationObject(user: UserJwtPayload, applicationId: string, resourceObjectInformation: resourceObjectInformation) {
    
    let informationObjectId = undefined;
    let informationObject = undefined;
    let position = 0;
    if("objectName" in resourceObjectInformation){
        //Create new Information Object
        informationObject = await createInformationObject(user, resourceObjectInformation.objectName);
        informationObjectId = informationObject._id;
    }
    else {
        // source -> application (input)
        const newResourceObjectRelation = new ResourceObjectRelation({
            organisationId: user.organisationId,
            informationObjectId: resourceObjectInformation.informationObjectId,
            sourceResourceId: resourceObjectInformation.sourceResourceId,
            sourceResourceType: resourceObjectInformation.sourceResourceType,
            targetResourceId: applicationId,
            targetResourceType: 'application',
            viaConnectionType: resourceObjectInformation.viaConnectionType ?? null,
            viaConnectionId: resourceObjectInformation.viaConnectionType ? resourceObjectInformation.viaConnectionId ?? null : null
        });
        await newResourceObjectRelation.save();

        informationObjectId = resourceObjectInformation.informationObjectId;
        informationObject = await InformationObject.findOne({
            organisationId: user.organisationId,
            _id: informationObjectId
        });
        position = 1;
    }
    const application = await Application.findOneAndUpdate(
        {
            _id: applicationId,
            organisationId: user.organisationId,
        },
        {
            $push: {
                inputInformationObjects: {
                    informationObjectId: informationObjectId,
                    position: position,
                }
            }
        },
        {
            returnDocument: 'after'
        }
    );
    if(!application) { 
        return {
            status: 400,
            success: false,
            message: "Application not found"
        }
    }
    return {
        application,
        informationObjects: [informationObject]
    };
}

export async function deleteApplicationInputInformationObject(user: UserJwtPayload, applicationId: string, objectInformationid: string) {
    
    const application = await Application.findOneAndUpdate(
        {
            _id: applicationId,
            organisationId: user.organisationId,
        },
        {
            $pull: {
                inputInformationObjects: {
                    informationObjectId: objectInformationid
                }
            }
        },
        {
            returnDocument: 'after'
        }
    );
    
    if(!application) { 
        return {
            status: 400,
            success: false,
            message: "Application not found"
        }
    }
    // Removes the direct relations of the input: source -> application (input)
    // and application (input) -> application (output). application (output) -> other resource is kept.
    await ResourceObjectRelation.deleteMany({
        organisationId: user.organisationId,
        informationObjectId: objectInformationid,
        targetResourceId: applicationId,
        targetResourceType: 'application'
    });
    return application;
}

export async function addApplicationOutputInformationObject(user: UserJwtPayload, applicationId: string, resourceObjectInformation: resourceObjectInformation) {

    let informationObjectId = undefined;
    let informationObject = undefined;
    let position = 0;
    if("objectName" in resourceObjectInformation){
        //Create new Information Object
        informationObject = await createInformationObject(user, resourceObjectInformation.objectName);
        informationObjectId = informationObject._id;
    }
    else {
        // application (input) -> application (output) when the object is forwarded
        const newResourceObjectRelation = new ResourceObjectRelation({
            organisationId: user.organisationId,
            informationObjectId: resourceObjectInformation.informationObjectId,
            sourceResourceId: resourceObjectInformation.sourceResourceId,
            sourceResourceType: resourceObjectInformation.sourceResourceType,
            targetResourceId: applicationId,
            targetResourceType: 'application',
            viaConnectionType: resourceObjectInformation.viaConnectionType ?? null,
            viaConnectionId: resourceObjectInformation.viaConnectionType ? resourceObjectInformation.viaConnectionId ?? null : null
        });
        await newResourceObjectRelation.save();

        informationObjectId = resourceObjectInformation.informationObjectId;
        informationObject = await InformationObject.findOne({
            organisationId: user.organisationId,
            _id: informationObjectId
        });
        position = 1;
    }
    const application = await Application.findOneAndUpdate(
        {
            _id: applicationId,
            organisationId: user.organisationId,
        },
        {
            $push: {
                outputInformationObjects: {
                    informationObjectId: informationObjectId,
                    position: position,
                }
            }
        },
        {
            returnDocument: 'after'
        }
    );
    if(!application) {
        return {
            status: 400,
            success: false,
            message: "Application not found"
        }
    }
    return {
        application,
        informationObjects: [informationObject]
    };
}

export async function deleteApplicationOutputInformationObject(user: UserJwtPayload, applicationId: string, objectInformationid: string) {

    const application = await Application.findOneAndUpdate(
        {
            _id: applicationId,
            organisationId: user.organisationId,
        },
        {
            $pull: {
                outputInformationObjects: {
                    informationObjectId: objectInformationid
                }
            }
        },
        {
            returnDocument: 'after'
        }
    );

    if(!application) {
        return {
            status: 400,
            success: false,
            message: "Application not found"
        }
    }
    // Removes the direct relations of the output: application (input) -> application (output)
    // and application (output) -> other resource. source -> application (input) is kept.
    await ResourceObjectRelation.deleteMany({
        organisationId: user.organisationId,
        informationObjectId: objectInformationid,
        sourceResourceId: applicationId,
        sourceResourceType: 'application'
    });
    // The object, and the fields that were only sendable through it, can no longer be sent through the apis of the application
    await cleanupApplicationApis(user, applicationId);
    return application;
}

async function canApplicationBeRemoved(user: UserJwtPayload, resourceId: string) {
    const apiConnections = await ApiConnection.find({
        organisationId: user.organisationId,
        $or: [ 
            { sourceId: resourceId },
            { targetId: resourceId }
        ]
    });
    if(apiConnections.length > 0){
        return {
            status: 409,
            success: false,
            message: "Cannot delete Application because it is still being used",
            dependencies: {
                apiConnections: apiConnections.map(connection => {
                    id: connection._id
                })
            }
        }
    }
    return {
        status: 200,
        success: true
    }
}