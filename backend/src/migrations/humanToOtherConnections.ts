import mongoose from 'mongoose';

// Human connections were merged into 'other' connections with the method 'human'.
// Moves the old human connections over (keeping their ids, so relations keep pointing at them)
// and renames the connection type on the relations. Safe to run on every start.
export async function migrateHumanToOtherConnections() {
    const database = mongoose.connection.db;
    if(!database) return;

    const humanConnections = database.collection('humanconnections');
    const otherConnections = database.collection('otherconnections');

    const oldConnections = await humanConnections.find({}).toArray();
    for(const connection of oldConnections) {
        await otherConnections.updateOne(
            { _id: connection._id },
            { $setOnInsert: { ...connection, method: 'human' } },
            { upsert: true }
        );
    }
    if(oldConnections.length) {
        await humanConnections.deleteMany({ _id: { $in: oldConnections.map((connection) => connection._id) } });
        console.log(`Moved ${oldConnections.length} human connection(s) to other connections`);
    }

    for(const relations of ['resourcefieldrelations', 'resourceobjectrelations']) {
        await database.collection(relations).updateMany(
            { viaConnectionType: 'human' },
            { $set: { viaConnectionType: 'other' } }
        );
    }
}
