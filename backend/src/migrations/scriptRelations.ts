import Component from '../models/component.model';
import { syncScriptRelations } from '../services/scriptRelation.service';

// What script components read and write gives relations between their host and the resources they read from and
// write to. They are kept up to date on every change; this adds them for the existing data. Safe to run on every start.
export async function migrateScriptRelations() {
    const environmentIds = await Component.distinct('environmentId', { kind: 'script' });
    for(const environmentId of environmentIds) {
        await syncScriptRelations({ environmentId: environmentId.toString() });
    }
}
