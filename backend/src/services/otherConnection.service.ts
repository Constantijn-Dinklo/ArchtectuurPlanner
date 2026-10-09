import { UserJwtPayload } from "../middelware";
import OtherConnection, { OTHER_CONNECTION_METHODS } from "../models/otherConnection.model";
import Application from "../models/resources/application.model";
import External from "../models/resources/external.model";
import InformationObject from "../models/information/informationObject.models";
import { getSendableFieldIds } from "./api.service";
import { syncOtherConnectionRelations } from "./externalRelation.service";

async function getOtherConnection(user: UserJwtPayload, otherConnectionId: string) {
    const otherConnection = await OtherConnection.findOne({
        _id: otherConnectionId,
        organisationId: user.organisationId
    });
    if(!otherConnection) {
        throw new Error("Connection not found");
    }
    return otherConnection;
}

export async function getOtherConnections(user: UserJwtPayload) {
    return await OtherConnection.find({
        organisationId: user.organisationId
    });
}

export async function createOtherConnection(user: UserJwtPayload, body: any) {
    const otherConnection = new OtherConnection({
        organisationId: user.organisationId,
        sourceId: body.sourceId || null,
        targetId: body.targetId || null,
        method: OTHER_CONNECTION_METHODS.includes(body.method) ? body.method : 'unknown',
        description: body.description ?? ''
    });
    await otherConnection.save();
    return otherConnection;
}

export async function updateOtherConnection(user: UserJwtPayload, otherConnectionId: string, body: any) {
    const existing = await getOtherConnection(user, otherConnectionId);

    // The carried information depends on the source, so it is only changed through its own functions
    const { sourceId, targetId, method, description } = body;
    const patch: Record<string, unknown> = {};
    if(sourceId !== undefined) {
        patch.sourceId = sourceId || null;
        // A new source means the carried information no longer belongs to it
        patch.informationFieldIds = [];
        patch.informationObjectIds = [];
    }
    if(targetId !== undefined) patch.targetId = targetId || null;
    if(description !== undefined) patch.description = description;
    if(method !== undefined) {
        if(!OTHER_CONNECTION_METHODS.includes(method)) throw new Error("Unknown connection method");
        patch.method = method;
    }

    const updated = await OtherConnection.findOneAndUpdate(
        {
            _id: otherConnectionId,
            organisationId: user.organisationId
        },
        { $set: patch },
        { returnDocument: 'after' }
    );

    await syncOtherConnectionRelations(user, otherConnectionId, existing.targetId?.toString());
    return updated;
}

export async function deleteOtherConnection(user: UserJwtPayload, otherConnectionId: string) {
    const deleted = await OtherConnection.findOneAndDelete({
        _id: otherConnectionId,
        organisationId: user.organisationId
    });
    // Removes the relations to an external element that came through this connection
    await syncOtherConnectionRelations(user, otherConnectionId, deleted?.targetId?.toString());
    return deleted;
}

// <-- Information carried over by the connection -->
// When the source is an application, only its output information can be carried over, just like with an api.
// When the source is an external element, only the information it provides.
// Other resources (databases, tables, file locations) are not checked.

async function checkSourceCanSendField(user: UserJwtPayload, sourceId: string, informationFieldId: string) {
    const application = await Application.findOne({ _id: sourceId, organisationId: user.organisationId });
    if(application) {
        const sendableFieldIds = await getSendableFieldIds(user, application);
        if(!sendableFieldIds.has(informationFieldId)) {
            throw new Error("Only output information fields of the source application can be carried over");
        }
        return;
    }

    const external = await External.findOne({ _id: sourceId, organisationId: user.organisationId });
    if(external) {
        const providedObjects = await InformationObject.find({
            _id: { $in: external.providedInformationObjects.map((object) => object.informationObjectId) },
            organisationId: user.organisationId
        });
        const providedFieldIds = new Set([
            ...external.providedInformationFields.map((field) => field.informationFieldId.toString()),
            ...providedObjects.flatMap((object) => object.informationFieldIds.map((fieldId) => fieldId.toString()))
        ]);
        if(!providedFieldIds.has(informationFieldId)) {
            throw new Error("Only information the external element provides can be carried over");
        }
    }
}

async function checkSourceCanSendObject(user: UserJwtPayload, sourceId: string, informationObjectId: string) {
    const application = await Application.findOne({ _id: sourceId, organisationId: user.organisationId });
    if(application) {
        const isOutputObject = application.outputInformationObjects.some(
            (object) => object.informationObjectId.toString() === informationObjectId
        );
        if(!isOutputObject) {
            throw new Error("Only output information objects of the source application can be carried over");
        }
        return;
    }

    const external = await External.findOne({ _id: sourceId, organisationId: user.organisationId });
    if(external) {
        const isProvided = external.providedInformationObjects.some(
            (object) => object.informationObjectId.toString() === informationObjectId
        );
        if(!isProvided) {
            throw new Error("Only information the external element provides can be carried over");
        }
    }
}

async function updateCarriedInformation(user: UserJwtPayload, otherConnectionId: string, update: Record<string, unknown>) {
    const otherConnection = await OtherConnection.findOneAndUpdate(
        {
            _id: otherConnectionId,
            organisationId: user.organisationId
        },
        update,
        { returnDocument: 'after' }
    );
    if(!otherConnection) {
        throw new Error("Connection not found");
    }
    await syncOtherConnectionRelations(user, otherConnectionId);
    return otherConnection;
}

export async function addOtherConnectionInformationField(user: UserJwtPayload, otherConnectionId: string, informationFieldId: string) {
    const otherConnection = await getOtherConnection(user, otherConnectionId);
    if(!otherConnection.sourceId) {
        throw new Error("Select the source of the connection first");
    }
    await checkSourceCanSendField(user, otherConnection.sourceId.toString(), informationFieldId);

    return await updateCarriedInformation(user, otherConnectionId, {
        $addToSet: { informationFieldIds: informationFieldId }
    });
}

export async function removeOtherConnectionInformationField(user: UserJwtPayload, otherConnectionId: string, informationFieldId: string) {
    return await updateCarriedInformation(user, otherConnectionId, {
        $pull: { informationFieldIds: informationFieldId }
    });
}

export async function addOtherConnectionInformationObject(user: UserJwtPayload, otherConnectionId: string, informationObjectId: string) {
    const otherConnection = await getOtherConnection(user, otherConnectionId);
    if(!otherConnection.sourceId) {
        throw new Error("Select the source of the connection first");
    }
    await checkSourceCanSendObject(user, otherConnection.sourceId.toString(), informationObjectId);

    return await updateCarriedInformation(user, otherConnectionId, {
        $addToSet: { informationObjectIds: informationObjectId }
    });
}

export async function removeOtherConnectionInformationObject(user: UserJwtPayload, otherConnectionId: string, informationObjectId: string) {
    return await updateCarriedInformation(user, otherConnectionId, {
        $pull: { informationObjectIds: informationObjectId }
    });
}
