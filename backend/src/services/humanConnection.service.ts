import { UserJwtPayload } from "../middelware";
import HumanConnection from "../models/humanConnection.model";
import Application from "../models/resources/application.model";
import { getSendableFieldIds } from "./api.service";

async function getHumanConnection(user: UserJwtPayload, humanConnectionId: string) {
    const humanConnection = await HumanConnection.findOne({
        _id: humanConnectionId,
        organisationId: user.organisationId
    });
    if(!humanConnection) {
        throw new Error("Human connection not found");
    }
    return humanConnection;
}

// When the source is an application, only its output information can be carried over, just like with an api.
// Other resources (databases, tables, file locations) are not checked.
async function getSourceApplication(user: UserJwtPayload, sourceId: string | null) {
    if(!sourceId) return null;
    return await Application.findOne({
        _id: sourceId,
        organisationId: user.organisationId
    });
}

export async function addHumanConnectionInformationField(user: UserJwtPayload, humanConnectionId: string, informationFieldId: string) {
    const humanConnection = await getHumanConnection(user, humanConnectionId);
    if(!humanConnection.sourceId) {
        throw new Error("Select the source of the human connection first");
    }

    const application = await getSourceApplication(user, humanConnection.sourceId.toString());
    if(application) {
        const sendableFieldIds = await getSendableFieldIds(user, application);
        if(!sendableFieldIds.has(informationFieldId)) {
            throw new Error("Only output information fields of the source application can be carried over");
        }
    }

    return await HumanConnection.findOneAndUpdate(
        {
            _id: humanConnectionId,
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

export async function removeHumanConnectionInformationField(user: UserJwtPayload, humanConnectionId: string, informationFieldId: string) {
    const humanConnection = await HumanConnection.findOneAndUpdate(
        {
            _id: humanConnectionId,
            organisationId: user.organisationId
        },
        {
            $pull: { informationFieldIds: informationFieldId }
        },
        {
            returnDocument: 'after'
        }
    );
    if(!humanConnection) {
        throw new Error("Human connection not found");
    }
    return humanConnection;
}

export async function addHumanConnectionInformationObject(user: UserJwtPayload, humanConnectionId: string, informationObjectId: string) {
    const humanConnection = await getHumanConnection(user, humanConnectionId);
    if(!humanConnection.sourceId) {
        throw new Error("Select the source of the human connection first");
    }

    const application = await getSourceApplication(user, humanConnection.sourceId.toString());
    if(application) {
        const isOutputObject = application.outputInformationObjects.some(
            (object) => object.informationObjectId.toString() === informationObjectId
        );
        if(!isOutputObject) {
            throw new Error("Only output information objects of the source application can be carried over");
        }
    }

    return await HumanConnection.findOneAndUpdate(
        {
            _id: humanConnectionId,
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

export async function removeHumanConnectionInformationObject(user: UserJwtPayload, humanConnectionId: string, informationObjectId: string) {
    const humanConnection = await HumanConnection.findOneAndUpdate(
        {
            _id: humanConnectionId,
            organisationId: user.organisationId
        },
        {
            $pull: { informationObjectIds: informationObjectId }
        },
        {
            returnDocument: 'after'
        }
    );
    if(!humanConnection) {
        throw new Error("Human connection not found");
    }
    return humanConnection;
}
