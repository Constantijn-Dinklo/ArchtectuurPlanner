import { UserJwtPayload } from "../middelware";
import ApiConnection from "../models/apiConnection.model";
import ViewNode from "../models/canvas/viewNode.model";
import { createInformationField, ResourceFieldInformation } from "./resourceField.service";
import { IResourceFieldExpanded, resolveResourceField } from "../models/resources/resourceField.model";
import Application from "../models/resources/application.model";
import ResourceFieldRelation from "../models/resources/resourceFieldRelation.model";


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

export async function addApplicationInputInformationField(user: UserJwtPayload, applicationId: string, resourceFieldInformation: ResourceFieldInformation) {
    //TODO: first check if the informationField already exists in the application

    let informationFieldId = undefined;
    let position = 0;
    if("fieldName" in resourceFieldInformation){
        //Create new Information Field
        const newInformationField = await createInformationField(user, resourceFieldInformation.fieldName);
        informationFieldId = newInformationField._id;
    }
    else {
        // Add a new ResourceFieldRelation
        const newResourceFieldRelation = await new ResourceFieldRelation({
            organisationId: user.organisationId,
            informationFieldId: resourceFieldInformation.informationFieldId,
            sourceResourceId: resourceFieldInformation.sourceResourceId,
            sourceResourceType: resourceFieldInformation.sourceResourceType,
            targetResourceId: applicationId,
            targetResourceType: 'application'
        });
        newResourceFieldRelation.save();

        informationFieldId = resourceFieldInformation.informationFieldId;
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
    ).populate<{
        inputInformationFields: IResourceFieldExpanded[];
        outputInformationFields: IResourceFieldExpanded[];
    }>([
        {
            path: 'inputInformationFields.informationFieldId'
        },
        {
            path: 'outputInformationFields.informationFieldId'
        }
    ]);
    if(!application) { 
        return {
            status: 400,
            success: false,
            message: "Application not found" 
        }
    }
    const resultApplication = resolveApplicationInformationFields(application);
    return resultApplication;
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
    }).populate<{
        inputInformationFields: IResourceFieldExpanded[];
        outputInformationFields: IResourceFieldExpanded[];
    }>([
        {
            path: 'inputInformationFields.informationFieldId'
        },
        {
            path: 'outputInformationFields.informationFieldId'
        }
    ]);
    if(!application) { 
        return {
            status: 400,
            success: false,
            message: "Application not found" 
        }
    }
    await ResourceFieldRelation.deleteMany(
        {
            organisationId: user.organisationId,
            informationFieldId: informationFieldId,
            targetResourceId: applicationId,
            targetResourceType: 'application'
        }
    )
    
    const resultApplication = resolveApplicationInformationFields(application);
    return resultApplication;
}

export async function addApplicationOutputInformationField(user: UserJwtPayload, applicationId: string, resourceFieldInformation: ResourceFieldInformation) {
    
    let informationFieldId = undefined;
    let position = 0;
    if("fieldName" in resourceFieldInformation){
        //Create new Information Field
        const newInformationField = await createInformationField(user, resourceFieldInformation.fieldName);
        informationFieldId = newInformationField._id;
    }
    else {
        // Add a new ResourceFieldRelation
        const newResourceFieldRelation = await new ResourceFieldRelation({
            organisationId: user.organisationId,
            informationFieldId: resourceFieldInformation.informationFieldId,
            sourceResourceId: resourceFieldInformation.sourceResourceId,
            sourceResourceType: resourceFieldInformation.sourceResourceType,
            targetResourceId: applicationId,
            targetResourceType: 'application'
        });
        newResourceFieldRelation.save();

        informationFieldId = resourceFieldInformation.informationFieldId;
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
    ).populate<{
        inputInformationFields: IResourceFieldExpanded[];
        outputInformationFields: IResourceFieldExpanded[];
    }>([
        {
            path: 'inputInformationFields.informationFieldId'
        },
        {
            path: 'outputInformationFields.informationFieldId'
        }
    ]);
    if(!application) { 
        return {
            status: 400,
            success: false,
            message: "Application not found" 
        }
    }
    const resultApplication = resolveApplicationInformationFields(application);
    return resultApplication;
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
    }).populate<{
        inputInformationFields: IResourceFieldExpanded[];
        outputInformationFields: IResourceFieldExpanded[];
    }>([
        {
            path: 'inputInformationFields.informationFieldId'
        },
        {
            path: 'outputInformationFields.informationFieldId'
        }
    ]);
    if(!application) { 
        return {
            status: 400,
            success: false,
            message: "Application not found" 
        }
    }
    await ResourceFieldRelation.deleteMany(
        {
            organisationId: user.organisationId,
            informationFieldId: informationFieldId,
            targetResourceId: applicationId,
            targetResourceType: 'application'
        }
    )
    
    const resultApplication = resolveApplicationInformationFields(application);
    return resultApplication;
}

export function resolveApplicationInformationFields(application: any){
    return {
        ...application.toJSON(),
        inputInformationFields: application.inputInformationFields.map(resolveResourceField),
        outputInformationFields: application.outputInformationFields.map(resolveResourceField)
    }
}

export function resolveApplicationsInformationFields(applications: any){
    const resolvedApplications = applications.map((application: any) => {
        return {
            ...application.toJSON(),
            inputInformationFields: application.inputInformationFields.map(resolveResourceField),
            outputInformationFields: application.outputInformationFields.map(resolveResourceField)
        }
    });
    return resolvedApplications;
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