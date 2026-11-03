# Pilot plan

Goal: test ArchitectuurPlanner in a real environment with a small pilot: one organisation, a handful of people, and the real architecture of one domain.

Written on 2026-11-01. Work through the steps in order and tick items off as they are done. Marked *(unchecked)* means the point is a judgement or was not confirmed in the code, so check it first.

## Step 1: Build, settings and staging

The three hosting items (same site, hosting setup, staging) wait until there is a domain and a name. Do them before Step 6, so problems with the deployment show up before testers do. Step 3's production database and backups depend on the hosting choice as well.

- [x] Make the API address configurable: `VITE_API_URL`, required for a build (see `frontend/.env.example`)
- [x] Make the allowed CORS origin configurable: `CORS_ORIGINS`, required in production (see `backend/.env.example`)
- [x] Set the login cookie to `secure: true`, so the backend has to be served over HTTPS
- [ ] Host frontend and backend on the same site, like `app.example.com` and `api.example.com`: the login cookie stays on `sameSite: 'strict'`, so login does not work across unrelated domains
- [x] Fix the 10 type errors so `npm run build` can pass. All were unused code
- [ ] Add the hosting setup: the repo has no Docker or CI configuration yet
- [ ] Deploy to a staging environment

## Step 2: Permissions and safe updates

- [x] Replace `$set: req.body` with a list of allowed fields, using `pickFields` in `backend/src/routes/pickFields.ts`. A request could overwrite any field, including `environmentId`. Routes:
  - [x] `backend/src/routes/apiConnectionRoutes.ts`
  - [x] `backend/src/routes/apiRoutes.ts`
  - [x] `backend/src/routes/canvas/viewRoutes.ts`
  - [x] `backend/src/routes/databaseConnectionRoutes.ts` (also checks that operations are `read` or `write`)
  - [x] `backend/src/routes/resources/databaseRoutes.ts`
  - [x] `backend/src/routes/resources/serverRoutes.ts`
  - [x] `backend/src/routes/resources/tableRoutes.ts`
  - [x] `backend/src/routes/scriptRoutes.ts`
- [ ] User management and roles, as one piece of work. Admin, editor and viewer are stored per environment (`environmentMember.model.ts`), but nothing checks them and an admin cannot change them yet in the management area (`ManagementView.vue`)
  - [x] Show an overview of the users of the organisation and their role per environment (`GET /org/users`, `ManagementView.vue`)
  - [x] Add an organisation role (`admin` or `member`) on `User`. An organisation admin is admin in every environment of the organisation, the first user of an organisation becomes admin, and the last admin cannot become a member. Existing users become admin through a migration (`migrations/organisationRoles.ts`)
  - [x] Let an organisation admin change the organisation role of a user (`PATCH /org/users/:id/role`, checked by `requireOrganisationAdmin`)
  - [x] Let an organisation admin change the role of a member in an environment (`PATCH /org/users/:id/environments/:environmentId/role`)
  - [x] Let an organisation admin remove a user: the user becomes inactive (`status` on `User`), cannot log in, and can be brought back. Deleting an inactive user marks it `deleted`, which hides it for everyone. Nobody can remove itself, and the last active admin cannot be removed  - [ ] Enforce the roles in the backend. Start with one check that blocks writes for viewers
  - [ ] Hide or disable editing in the frontend for viewers
- [ ] Add login rate limiting and security headers: `app.ts` has neither *(the rest of the backend is unchecked)*
- [ ] Decide how people get an account: signup in `backend/src/routes/auth.ts` puts every new user in one hardcoded `organisationId`, and anyone can sign up
- [ ] Remove the login token from the signup response in `backend/src/routes/auth.ts`, which partly undoes the protection of `httpOnly`. Check first that the frontend does not use it
- [ ] Decide how long a login should last: the cookie lasts 60 minutes and the token inside it 24 hours, so people get logged out after an hour. Make them match

## Step 3: Data safety

- [ ] Use a separate production database
- [ ] Set up backups and test a restore once. There is no undo, so a backup may be the only way back from a mistake
- [ ] Add an environment export, so an environment can be saved before a risky change *(does not exist yet, as far as checked)*

## Step 4: Tests and error messages

- [ ] Add Vitest and a small suite for the information chain (`frontend/src/services/informationChain.service.ts`, about 950 lines). There are no automated tests yet
- [ ] Start with these chain cases: source connected and splitting, source not connected to a chain, two separate chains, source alone, source with its own unfed input, something feeding the source, information in a resource without relations
- [ ] Make every write show an error when it fails. Known examples: a failed `commitApi` (**+ New API**) shows nothing, and `deleteApi` only reports a 409
- [ ] Show relation sync failures: `keepExternalSourceRelationsInSync` only logs them and the user still sees success, so chains can quietly go out of date
- [ ] Test the speed of that sync with real data volumes: it re-syncs the whole environment on every write

## Step 5: Settle the model

- [ ] Choose one kind of script: the old `script` model still exists next to the newer script components, and the canvas handles both (`scriptIds` and `componentScriptIds`)
- [ ] Show the API a script reads through in the information chain
- [ ] Add other ways to read from an application or external: queue or event stream, scraping or RPA, email, inside the application, unknown. The list on other connections (`human`, `feature`, `file`, `email`, `unknown`) could be extended
- [ ] Show a yellow warning when that way of reading is not filled in
- [ ] Decide whether a script read should count as an API connection in the relations. It is still recorded as going via the script
- [ ] Decide on the yellow warning for a connection without a table or file: writes only, or reads as well. It currently shows for both

## Step 6: Usability, then start the pilot

- [ ] Style the login and signup pages: they currently have no styling at all, and they are the first thing testers see
- [ ] Make the connections on the canvas move, so you can see the direction information flows in
- [ ] Add catalogue filters such as "no source" and "broken chain", plus a progress count. At the last scan, 30 of 37 items were not in any resource *(check whether filters already exist)*
- [ ] Add a short getting-started path for an empty canvas *(unchecked)*
- [ ] Add a catalogue export: there is no export in the app yet. `frontend/src/helpers/export.ts` (`exportToCsv`) can be reused
- [ ] Add a simple way for testers to give feedback, and error monitoring
- [ ] Start the pilot

## During the pilot: questions to ask

- Who owns each piece of information, and which roles would you name?
- Does a field ever have a different owner from its object in practice?
- Does information get added to an object along the way, like the permit example? Would separate objects be enough, or does it need modelling?

## After the pilot

Leave these until the pilot has given feedback.

### Governance and data ownership

- A Governance section where all roles in an organisation are defined
- Those roles become the options for the owner of an information field or object
- Open question: what does it mean when an object has one owner and a field inside it has another? Maybe no issue, maybe it is

### Processes

- Define the processes of an organisation
- This probably needs other elements first, such as Governance

### Information objects that grow

An object can gain information as it travels through the system or a process. A permit might start as a request with a location, a description and the applicant. Later it might gain who gave approval, a drawing of the location, a BAG ID or a BGT ID.

### Earlier parked work

- Selecting information in Architecture with a source checkbox
- AutoComplete that stores the ID when choosing information
- A nested design for tracking information in components, servers and teams
- Semantic zoom step 4 (capped regions)
- Generalising connection owners
- Splitting up large files, such as `ApplicationDetails.vue` (1600 lines)
