import mongoose from 'mongoose';
import ResourceFieldRelation from '../models/information/resourceFieldRelation.model';
import ResourceObjectRelation from '../models/information/resourceObjectRelation.model';

// The old scripts (the Scripts tab) are gone; scripts are now components inside an application or file location.
// Relations that went via an old script keep their information, but no longer name that script as their route.
// Old scripts that are still stored are not deleted, only reported. Safe to run on every start.
export async function migrateRemoveOldScripts() {
    const database = mongoose.connection.db;
    if(!database) return;

    const clearVia = { $set: { viaConnectionType: null, viaConnectionId: null } };
    const fields = await ResourceFieldRelation.collection.updateMany({ viaConnectionType: 'script' }, clearVia);
    const objects = await ResourceObjectRelation.collection.updateMany({ viaConnectionType: 'script' }, clearVia);
    const cleared = fields.modifiedCount + objects.modifiedCount;
    if(cleared) {
        console.log(`Cleared the old script as the route of ${cleared} relation(s)`);
    }

    const oldScriptCount = await database.collection('scripts').countDocuments();
    if(oldScriptCount) {
        console.warn(`⚠️ ${oldScriptCount} old script(s) are still stored in the 'scripts' collection. The app no longer uses them`);
    }
}
