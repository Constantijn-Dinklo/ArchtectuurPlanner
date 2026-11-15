import dotenv from "dotenv";
dotenv.config();

import mongoose from 'mongoose';
import Environment from '../models/environment.model';
import View from '../models/canvas/view.model';

// Empties one environment: every document that belongs to it (resources, information, relations, connections, apis,
// endpoints, components, views, ...) is removed, in every collection of the database.
// Kept: the environment itself, its members, and the organisations and users. The canvas always needs a view,
// so the environment gets a new empty 'Main view'.
//
// npm run clear:environment                              lists the environments
// npm run clear:environment -- "<name or id>"            shows what would be removed (nothing is removed)
// npm run clear:environment -- "<name or id>" confirm    removes it
// (a plain 'confirm': PowerShell drops the '--', and npm then keeps '--confirm' for itself)

const KEPT_COLLECTIONS = ['environments', 'environmentmembers', 'users', 'organisations'];

async function listEnvironments() {
    const environments = await Environment.find().sort({ name: 1 });
    console.log('Environments:');
    environments.forEach((environment) => console.log(`  ${environment._id}  ${environment.name}  (organisation ${environment.organisationId})`));
}

async function findEnvironment(nameOrId: string) {
    const byId = mongoose.isValidObjectId(nameOrId) ? await Environment.findById(nameOrId) : null;
    if(byId) return byId;

    const byName = await Environment.find({ name: nameOrId });
    if(byName.length > 1) throw new Error(`There are ${byName.length} environments named "${nameOrId}": use the id instead`);
    if(!byName.length) throw new Error(`No environment "${nameOrId}"`);
    return byName[0]!;
}

async function clear(nameOrId: string, confirm: boolean) {
    const environment = await findEnvironment(nameOrId);
    const db = mongoose.connection.db!;
    // Stored as an ObjectId, but a string would belong to it as well
    const filter = { environmentId: { $in: [environment._id, environment._id.toString()] } };

    console.log(`Environment: ${environment.name} (${environment._id})`);
    console.log(confirm ? 'Removing:' : 'Would remove (dry run, add confirm after the name or id to remove):');

    let total = 0;
    for(const { name } of await db.listCollections().toArray()) {
        if(KEPT_COLLECTIONS.includes(name)) continue;
        const collection = db.collection(name);
        const count = await collection.countDocuments(filter);
        if(!count) continue;
        total += count;
        if(confirm) await collection.deleteMany(filter);
        console.log(`  ${name}: ${count}`);
    }
    if(!total) console.log('  nothing');

    if(confirm) {
        await new View({ environmentId: environment._id, name: 'Main view' }).save();
        console.log(`\nRemoved ${total} document(s). The environment has a new empty 'Main view'.`);
    }
}

async function main() {
    if(!process.env.MONGO_URI) throw new Error('MONGO_URI is missing in .env');
    await mongoose.connect(process.env.MONGO_URI);
    try {
        const args = process.argv.slice(2);
        const confirm = args.some((arg) => arg === 'confirm' || arg === '--confirm');
        const nameOrId = args.find((arg) => !arg.startsWith('--') && arg !== 'confirm');
        if(!nameOrId) await listEnvironments();
        else await clear(nameOrId, confirm);
    }
    finally {
        await mongoose.disconnect();
    }
}

main().catch((err) => {
    console.error(err.message ?? err);
    process.exit(1);
});
