import User from '../models/user.model';

// Users used to have no organisation role. The existing users all become admin, so nobody loses what they could do.
// Users that already have a role are left alone, so this is safe to run on every start.
export async function migrateOrganisationRoles() {
    const result = await User.collection.updateMany(
        { organisationRole: { $exists: false } },
        { $set: { organisationRole: 'admin' } }
    );
    if(result.modifiedCount) {
        console.log(`Made ${result.modifiedCount} existing user(s) admin of their organisation`);
    }
}
