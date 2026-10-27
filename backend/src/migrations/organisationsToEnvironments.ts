import mongoose, { Model } from 'mongoose';
import Environment from '../models/environment.model';
import View from '../models/canvas/view.model';
import ViewNode from '../models/canvas/viewNode.model';
import Application from '../models/resources/application.model';
import Database from '../models/resources/database.model';
import Table from '../models/resources/table.model';
import FileLocation from '../models/resources/fileLocation.model';
import Server from '../models/resources/server.model';
import External from '../models/resources/external.model';
import Api from '../models/api.model';
import ApiConnection from '../models/apiConnection.model';
import DatabaseConnection from '../models/databaseConnection.model';
import Script from '../models/script.model';
import OtherConnection from '../models/otherConnection.model';
import Endpoint from '../models/endpoint.model';
import InformationField from '../models/information/informationField.model';
import InformationObject from '../models/information/informationObject.models';
import ResourceFieldRelation from '../models/information/resourceFieldRelation.model';
import ResourceObjectRelation from '../models/information/resourceObjectRelation.model';

// All the architecture data. It used to belong to an organisation, it now belongs to an environment
const DATA_MODELS: Model<any>[] = [
    View, ViewNode,
    Application, Database, Table, FileLocation, Server, External,
    Api, ApiConnection, DatabaseConnection, Script, OtherConnection, Endpoint,
    InformationField, InformationObject, ResourceFieldRelation, ResourceObjectRelation
];

// Every organisation that has data gets a 'Main environment', and all its data is moved into it.
// Documents that already have an environment are left alone, so this is safe to run on every start.
export async function migrateOrganisationsToEnvironments() {
    const database = mongoose.connection.db;
    if(!database) return;

    const collections = DATA_MODELS.map((model) => database.collection(model.collection.name));

    const organisationIds = new Set<string>();
    for(const collection of collections) {
        const ids = await collection.distinct('organisationId', { environmentId: { $exists: false } });
        ids.filter((id) => id).forEach((id) => organisationIds.add(id.toString()));
    }
    if(!organisationIds.size) return;

    for(const organisationId of organisationIds) {
        let environment = await Environment.findOne({ organisationId }).sort({ createdAt: 1 });
        if(!environment) {
            environment = await new Environment({ organisationId, name: 'Main environment' }).save();
        }

        let moved = 0;
        for(const collection of collections) {
            const result = await collection.updateMany(
                { organisationId: new mongoose.Types.ObjectId(organisationId), environmentId: { $exists: false } },
                {
                    $set: { environmentId: environment._id },
                    $unset: { organisationId: '' }
                }
            );
            moved += result.modifiedCount;
        }
        console.log(`Moved ${moved} document(s) of organisation ${organisationId} to environment '${environment.name}'`);
    }
}
