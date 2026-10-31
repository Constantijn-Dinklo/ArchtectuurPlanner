import { UserJwtPayload } from "../middelware";
import Api from "../models/api.model";
import Component from "../models/component.model";
import Endpoint from "../models/endpoint.model";
import InformationField from "../models/information/informationField.model";
import InformationObject from "../models/information/informationObject.models";
import ResourceFieldRelation from "../models/information/resourceFieldRelation.model";
import ResourceObjectRelation from "../models/information/resourceObjectRelation.model";
import OtherConnection from "../models/otherConnection.model";
import Application from "../models/resources/application.model";
import External from "../models/resources/external.model";
import Table from "../models/resources/table.model";

type Kind = 'field' | 'object';

// Everything that still uses a piece of information, as text for the user. Information can only be deleted when this
// is empty: besides its relations it can be held without a relation, and those places need the information to exist
export async function getInformationUsage(user: UserJwtPayload, kind: Kind, informationId: string) {
    const type = kind === 'field' ? 'Field' : 'Object';
    const idKey = `information${type}Id`;
    const idsKey = `information${type}Ids`;
    const listKey = `Information${type}s`;
    const environmentId = user.environmentId;

    const has = (...paths: string[]): any => ({ environmentId, $or: paths.map((path) => ({ [path]: informationId })) });
    const usage: string[] = [];

    const relations = kind === 'field'
        ? await ResourceFieldRelation.countDocuments({ environmentId, informationFieldId: informationId })
        : await ResourceObjectRelation.countDocuments({ environmentId, informationObjectId: informationId });
    if(relations) usage.push(`${relations} ${relations === 1 ? 'relation' : 'relations'}`);

    const applications = await Application.find(has(`input${listKey}.${idKey}`, `output${listKey}.${idKey}`));
    usage.push(...applications.map((application) => `Application ${application.name}`));

    const externals = await External.find(has(`provided${listKey}.${idKey}`, `received${listKey}.${idKey}`));
    usage.push(...externals.map((external) => `External ${external.name}`));

    const components = await Component.find(has(
        idsKey,
        `inputInformation${type}Ids`,
        `outputInformation${type}Ids`,
        `inputs.${idsKey}`,
        `outputs.${idsKey}`
    ));
    usage.push(...components.map((component) => `${component.kind === 'script' ? 'Script' : 'File'} ${component.name}`));

    const endpoints = await Endpoint.find(has(idsKey));
    usage.push(...endpoints.map((endpoint) => `Endpoint ${endpoint.name}`));

    const apis = await Api.find(has(idsKey));
    usage.push(...apis.map((api) => `API ${api.url}`));

    const otherConnections = await OtherConnection.find(has(idsKey));
    usage.push(...otherConnections.map((connection) => `Connection ${connection.description || connection.method}`));

    if(kind === 'field') {
        const tables = await Table.find(has('columns.informationFieldId'));
        usage.push(...tables.map((table) => `Table ${table.name}`));

        const objects = await InformationObject.find(has('informationFieldIds'));
        usage.push(...objects.map((object) => `Object ${object.objectName}`));
    }

    return usage;
}

export async function deleteInformation(user: UserJwtPayload, kind: Kind, informationId: string) {
    const usage = await getInformationUsage(user, kind, informationId);
    if(usage.length) throw new Error(`This is still used: ${usage.join(', ')}`);

    const filter = { _id: informationId, environmentId: user.environmentId };
    const deleted = kind === 'field'
        ? await InformationField.findOneAndDelete(filter)
        : await InformationObject.findOneAndDelete(filter);
    if(!deleted) throw new Error(`Information ${kind} not found`);
    return { id: informationId };
}
