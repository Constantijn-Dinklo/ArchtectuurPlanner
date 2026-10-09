import { UserJwtPayload } from "../middelware";
import ViewNode from "../models/canvas/viewNode.model";
import External, { EXTERNAL_KINDS, IExternal } from "../models/resources/external.model";
import InformationField from "../models/information/informationField.model";
import InformationObject from "../models/information/informationObject.models";
import { createInformationField } from "./resourceField.service";
import { createInformationObject } from "./resourceObject.service";

// The information fields and objects an external element refers to, so the frontend can resolve them
async function getReferencedInformation(user: UserJwtPayload, externals: IExternal[]) {
    const informationObjectIds = externals.flatMap((external) => [
        ...external.providedInformationObjects,
        ...external.receivedInformationObjects
    ].map((object) => object.informationObjectId));

    const informationObjects = await InformationObject.find({
        _id: { $in: informationObjectIds },
        organisationId: user.organisationId
    });

    const informationFieldIds = new Set<string>();
    for(const external of externals) {
        [...external.providedInformationFields, ...external.receivedInformationFields]
            .forEach((field) => informationFieldIds.add(field.informationFieldId.toString()));
    }
    informationObjects
        .flatMap((object) => object.informationFieldIds)
        .forEach((fieldId) => informationFieldIds.add(fieldId.toString()));

    const informationFields = await InformationField.find({
        _id: { $in: [...informationFieldIds] },
        organisationId: user.organisationId
    });

    return { informationFields, informationObjects };
}

async function withReferencedInformation(user: UserJwtPayload, external: IExternal | null) {
    if(!external) {
        throw new Error("External element not found");
    }
    const { informationFields, informationObjects } = await getReferencedInformation(user, [external]);
    return { external, informationFields, informationObjects };
}

export async function getExternals(user: UserJwtPayload) {
    const externals = await External.find({
        organisationId: user.organisationId
    });
    const { informationFields, informationObjects } = await getReferencedInformation(user, externals);
    return { externals, informationFields, informationObjects };
}

export async function createExternal(user: UserJwtPayload, name: string, viewId: string) {
    if(!name?.trim()) {
        throw new Error("An external element needs a name");
    }

    const external = new External({
        organisationId: user.organisationId,
        name: name.trim()
    });
    await external.save();

    const viewNode = new ViewNode({
        organisationId: user.organisationId,
        viewId: viewId,
        entityId: external._id,
        entityType: 'external',
        position: {
            x: Math.random() * 400,
            y: Math.random() * 400
        }
    });
    await viewNode.save();

    return { external, viewNode };
}

export async function updateExternal(user: UserJwtPayload, externalId: string, body: any) {
    // Only the description of the black box can be changed here; the information has its own functions
    const patch: Record<string, unknown> = {};
    if(body.name !== undefined) {
        if(!body.name.trim()) throw new Error("An external element needs a name");
        patch.name = body.name.trim();
    }
    if(body.externalOrganisation !== undefined) patch.externalOrganisation = body.externalOrganisation;
    if(body.owner !== undefined) patch.owner = body.owner;
    if(body.description !== undefined) patch.description = body.description;
    if(body.kind !== undefined) {
        if(!EXTERNAL_KINDS.includes(body.kind)) throw new Error("Unknown kind of external element");
        patch.kind = body.kind;
    }

    const external = await External.findOneAndUpdate(
        {
            _id: externalId,
            organisationId: user.organisationId
        },
        { $set: patch },
        { returnDocument: 'after' }
    );
    if(!external) {
        throw new Error("External element not found");
    }
    return external;
}

export async function deleteExternal(user: UserJwtPayload, externalId: string) {
    const deletedNode = await ViewNode.findOneAndDelete({
        organisationId: user.organisationId,
        entityId: externalId
    });

    const deleted = await External.findOneAndDelete({
        _id: externalId,
        organisationId: user.organisationId
    });
    if(!deleted) {
        throw new Error("External element not found");
    }

    return {
        resourceId: deleted._id,
        viewNodeId: deletedNode?._id
    };
}

// <-- Information the external element provides -->
// Provided information is decided by the user: an existing field or object, or a new one

export type ProvidedFieldInformation =
    | { fieldName: string }
    | { informationFieldId: string };

export type ProvidedObjectInformation =
    | { objectName: string }
    | { informationObjectId: string };

export async function addProvidedInformationField(user: UserJwtPayload, externalId: string, information: ProvidedFieldInformation) {
    let informationFieldId;
    if("fieldName" in information) {
        if(!information.fieldName?.trim()) throw new Error("A field needs a name");
        const informationField = await createInformationField(user, information.fieldName.trim());
        informationFieldId = informationField._id;
    }
    else {
        informationFieldId = information.informationFieldId;
    }

    const external = await External.findOneAndUpdate(
        {
            _id: externalId,
            organisationId: user.organisationId,
            // Do not add the field a second time
            'providedInformationFields.informationFieldId': { $ne: informationFieldId }
        },
        {
            $push: {
                providedInformationFields: { informationFieldId, position: 0 }
            }
        },
        { returnDocument: 'after' }
    ) ?? await External.findOne({ _id: externalId, organisationId: user.organisationId });

    return withReferencedInformation(user, external);
}

export async function removeProvidedInformationField(user: UserJwtPayload, externalId: string, informationFieldId: string) {
    const external = await External.findOneAndUpdate(
        {
            _id: externalId,
            organisationId: user.organisationId
        },
        {
            $pull: {
                providedInformationFields: { informationFieldId }
            }
        },
        { returnDocument: 'after' }
    );
    return withReferencedInformation(user, external);
}

export async function addProvidedInformationObject(user: UserJwtPayload, externalId: string, information: ProvidedObjectInformation) {
    let informationObjectId;
    if("objectName" in information) {
        if(!information.objectName?.trim()) throw new Error("An object needs a name");
        const informationObject = await createInformationObject(user, information.objectName.trim());
        informationObjectId = informationObject._id;
    }
    else {
        informationObjectId = information.informationObjectId;
    }

    const external = await External.findOneAndUpdate(
        {
            _id: externalId,
            organisationId: user.organisationId,
            // Do not add the object a second time
            'providedInformationObjects.informationObjectId': { $ne: informationObjectId }
        },
        {
            $push: {
                providedInformationObjects: { informationObjectId, position: 0 }
            }
        },
        { returnDocument: 'after' }
    ) ?? await External.findOne({ _id: externalId, organisationId: user.organisationId });

    return withReferencedInformation(user, external);
}

export async function removeProvidedInformationObject(user: UserJwtPayload, externalId: string, informationObjectId: string) {
    const external = await External.findOneAndUpdate(
        {
            _id: externalId,
            organisationId: user.organisationId
        },
        {
            $pull: {
                providedInformationObjects: { informationObjectId }
            }
        },
        { returnDocument: 'after' }
    );
    return withReferencedInformation(user, external);
}
