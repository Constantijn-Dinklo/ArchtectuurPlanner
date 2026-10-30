import External from '../models/resources/external.model';
import { syncExternalSourceRelations } from '../services/externalSourceRelation.service';

// Relations from external elements to the resources they are connected to used to be missing. They are now kept
// up to date on every change; this adds them for the existing data. Safe to run on every start.
export async function migrateExternalSourceRelations() {
    const environmentIds = await External.distinct('environmentId');
    for(const environmentId of environmentIds) {
        await syncExternalSourceRelations({ environmentId: environmentId.toString() });
    }
}
