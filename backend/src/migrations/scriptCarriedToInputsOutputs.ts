import mongoose from 'mongoose';

// A script used to have one list of information it carried. It now has input information (what it takes in) and
// output information (what it produces), like an application. What a script carried becomes both its input and its
// output information. Safe to run on every start.
export async function migrateScriptCarriedToInputsOutputs() {
    const database = mongoose.connection.db;
    if(!database) return;

    const components = database.collection('components');
    const scripts = await components.find({
        kind: 'script',
        $or: [
            { 'informationFieldIds.0': { $exists: true } },
            { 'informationObjectIds.0': { $exists: true } }
        ]
    }).toArray();

    for(const script of scripts) {
        const fieldIds = script.informationFieldIds ?? [];
        const objectIds = script.informationObjectIds ?? [];
        await components.updateOne(
            { _id: script._id },
            {
                $addToSet: {
                    inputInformationFieldIds: { $each: fieldIds },
                    outputInformationFieldIds: { $each: fieldIds },
                    inputInformationObjectIds: { $each: objectIds },
                    outputInformationObjectIds: { $each: objectIds }
                },
                $set: { informationFieldIds: [], informationObjectIds: [] }
            }
        );
    }
    if(scripts.length) {
        console.log(`Moved the carried information of ${scripts.length} script(s) to their inputs and outputs`);
    }
}
