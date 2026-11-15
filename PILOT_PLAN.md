# Pilot plan

Goal: test ArchitectuurPlanner in a real environment with a small pilot: one organisation, a handful of people, and the real architecture of one domain.

Written on 2026-11-01. Work through the steps in order and tick items off as they are done. Marked *(unchecked)* means the point is a judgement or was not confirmed in the code, so check it first.

## Step 1: Permissions and safe updates (done)

- [x] Replace `$set: req.body` with a list of allowed fields, using `pickFields` in `backend/src/routes/pickFields.ts`. A request could overwrite any field, including `environmentId`. Routes:
  - [x] `backend/src/routes/apiConnectionRoutes.ts`
  - [x] `backend/src/routes/apiRoutes.ts`
  - [x] `backend/src/routes/canvas/viewRoutes.ts`
  - [x] `backend/src/routes/databaseConnectionRoutes.ts` (also checks that operations are `read` or `write`)
  - [x] `backend/src/routes/resources/databaseRoutes.ts`
  - [x] `backend/src/routes/resources/serverRoutes.ts`
  - [x] `backend/src/routes/resources/tableRoutes.ts`
  - [x] `backend/src/routes/scriptRoutes.ts`
- [x] User management and roles, as one piece of work. Admin, editor and viewer are stored per environment (`environmentMember.model.ts`), and can be managed in the management area (`ManagementView.vue`)
  - [x] Show an overview of the users of the organisation and their role per environment (`GET /org/users`, `ManagementView.vue`)
  - [x] Add an organisation role (`admin` or `member`) on `User`. An organisation admin is admin in every environment of the organisation, and the last admin cannot become a member. Existing users become admin through a migration (`migrations/organisationRoles.ts`)
  - [x] Let an organisation admin change the organisation role of a user (`PATCH /org/users/:id/role`, checked by `requireOrganisationAdmin`)
  - [x] Let an organisation admin change the role of a member in an environment (`PATCH /org/users/:id/environments/:environmentId/role`)
  - [x] Let an organisation admin remove a user: the user becomes inactive (`status` on `User`), cannot log in, and can be brought back. Deleting an inactive user marks it `deleted`, which hides it for everyone. Nobody can remove itself, and the last active admin cannot be removed
  - [x] Enforce the roles in the backend: `requireEnvironment` refuses every request except GET for viewers, and viewers cannot add or remove environment members (`getEnvironmentRole` in `middelware.ts`)
- [x] Add login rate limiting and security headers: 10 failed logins per 15 minutes per IP address (`backend/src/config/rateLimit.ts`), and `helmet` for the headers of the backend
- [x] Decide how people get an account: only an organisation admin can add a user, from the management area. `/auth/signup` requires an organisation admin and adds the user as a member of the admin's organisation. The public signup form is gone
- [x] Remove the login token from the signup response: signup no longer logs anyone in, so it returns no token and sets no cookie
- [x] Decide how long a login should last: the cookie and the token both last 4 hours, and are renewed while the user is active, at most once per 15 minutes (`backend/src/config/session.ts`). A login ends after 4 hours without any request

## Step 2: Settle the model

### Connections and relations redesign

Today two resources are linked in three different ways (`ApiConnection`, `DatabaseConnection`, `OtherConnection`), scripts have their own reads and writes, and the information relations are stored separately with an optional `via`. Nothing makes these agree: information can move without a connection, and a connection can exist without anything going through it. Every feature that touches "a connection" has to handle all of the shapes.

The new model has three layers:

- **Parts**: everything in the landscape, each inside a parent. A server holds resources, a resource holds components (an application holds scripts, a database holds tables, a file location holds files)
- **Connection**: a directed link from one part to another, saying *how* things can get there
- **Relation**: one information field or object moving from one part to another, always through one connection

Decisions:

- **One `Connection` model** for every pair of parts. Shared fields: `source`, `target`, `kind`, `description`. One collection, with a schema per kind for the fields only that kind has (Mongoose discriminators). For now only `api` has one: `apiId`, the API of the source
- **Kinds** form one list: `api`, `database`, `file`, `manual`, `email`, `feature`, `unknown`, extendable (queue or event stream, scraping or RPA, ...). There is no separate "other" type with methods any more
- **`unknown` is a real kind**: it says that something gets there but nobody knows how yet. Showing these gaps is one of the aims of the program, so it gets a clear warning, not an error
- **Direction instead of operations**: a database that is read and written gets two connections, database → application and application → database
- **Ends are an id plus a type**, for both connections and relations, for example `{ id, type: 'table' }`. A type can be a resource or a component (`script`, `file`, `table`). Levels above a resource (server, later team) are never stored: they follow from the parents
- **Every relation has a required `connectionId`**. What a connection carries is the relations that point at it, so connections no longer keep their own list of carried information
- **The rule**: a relation's end is the same part as its connection's end, or a part inside it. Example: the connection goes from a database to an application (an application has one connection to a database, not one per table), the relation goes from the table to the application, so it is always known which table the information came from
- **Inside a resource** information can go from an input to an output: this stays a relation, with the same source and target and no connection. For now only in applications, later possibly in other resources too
- **Scripts are parts, not resources**, but they can be connection and relation ends: CRM → script (api) → table, with the relations along the same route. This reverses the earlier decision (2026-10-30) to keep components out of the relations, without adding a field per level: there is still one end id
- **Drawing**: an end is drawn at the closest level that is visible. When the level of detail hides scripts, the arrow CRM → script is drawn as CRM → host of the script, and a table's relations are drawn at its database when tables are hidden. Nothing extra is stored for this
- **Several connections between the same two parts** are fine, for example an API and a manual download, and every relation says which one it goes through
- **A later switch to a typed (relational) database** stays possible: the kinds are TypeScript types that differ by `kind`, the database is only reached through the connection service, and the model maps to one table with checks (or a table per kind with a foreign key)

Phase 1, connections at the level of resources:

- [x] Add the `Connection` model (one collection, a schema per kind, ends as `{ id, type }`) and one connection service that is the only place that reads and writes connections: `models/connection.model.ts`, `types/connection.type.ts`, `services/connection.service.ts`, routes on `/connections`. Nothing uses it yet
- [ ] Give relations a required `connectionId` instead of `viaConnectionType` and `viaConnectionId`. Allow the one exception: a relation inside a resource (same source and target) has no connection
- [ ] Migrate: every `ApiConnection` and `OtherConnection` becomes one connection, every `DatabaseConnection` one or two (one per direction), the carried information of other connections is checked against the relations, and relations without a connection get an `unknown` one
- [ ] Move the backend over: the external element sync, the received information of external elements, removing resources, and the information usage
- [ ] Move the frontend over: the connection tables, the canvas lines, the information source and information chain services, the via choice, and the 'Receives from' and 'Sends to' sections of an application (`InformationRelationsSection.vue`, `/resourceConnections`), which then become simple: connecting two resources is creating one connection
- [ ] Remove the old models, routes and stores of the three connection types

Phase 2, components as ends:

- [ ] Make tables components of their database, the way files are components of a file location. Tables keep their ids when they move into the components collection, so references stay valid
- [ ] Turn the reads and writes of scripts into connections and relations (source → script, script → target), and remove the script relation sync (`scriptRelation.service.ts`) and the inputs and outputs that scripts keep themselves
- [ ] Let files be relation ends, so it is known which file information is in
- [ ] Draw every end at the closest visible level on the canvas

Do both phases before the pilot, so no live data has to be migrated.

### Other model items

- [x] Choose one kind of script: the old `script` model (the Scripts tab) is removed, so scripts only exist as components inside an application or file location. Relations that went via an old script keep their information but lose that route (`migrations/removeOldScripts.ts`)
- [x] Show the API a script reads through in the information chain: the arrow into the script shows the url of the API (`InformationChainBranch.vue`)
- [ ] Show a yellow warning when it is not known how a script reads (the `unknown` connection kind of the redesign)
- [ ] Decide on the yellow warning for a connection without a table or file: writes only, or reads as well. It currently shows for both
- [ ] Hide or disable editing in the frontend for viewers. Until then a viewer sees edit controls, and their changes fail with "A viewer cannot make changes in this environment"
- [ ] Remove that anyone can create an organisation: `POST /org/create` is public, and the login page still has a form for it. Close the route, remove the form, and decide how a new organisation and its first admin are made instead (for example by a script)

## Step 3: Tests and error messages

- [ ] Add Vitest and a small suite for the information chain (`frontend/src/services/informationChain.service.ts`, about 950 lines). There are no automated tests yet
- [ ] Start with these chain cases: source connected and splitting, source not connected to a chain, two separate chains, source alone, source with its own unfed input, something feeding the source, information in a resource without relations
- [ ] Make every write show an error when it fails. Known examples: a failed `commitApi` (**+ New API**) shows nothing, and `deleteApi` only reports a 409
- [ ] Show relation sync failures: `keepExternalSourceRelationsInSync` only logs them and the user still sees success, so chains can quietly go out of date
- [ ] Test the speed of that sync with real data volumes: it re-syncs the whole environment on every write

## Step 4: Usability

- [ ] Style the login page: it currently has no styling at all, and it is the first thing testers see
- [ ] Make the connections on the canvas move, so you can see the direction information flows in
- [ ] Add catalogue filters such as "no source" and "broken chain", plus a progress count. At the last scan, 30 of 37 items were not in any resource *(check whether filters already exist)*
- [ ] Add a short getting-started path for an empty canvas *(unchecked)*
- [ ] Add a catalogue export: there is no export in the app yet. `frontend/src/helpers/export.ts` (`exportToCsv`) can be reused

## Step 5: Data safety

The production database and backups depend on the hosting choice in Step 6.

- [ ] Use a separate production database
- [ ] Set up backups and test a restore once. There is no undo, so a backup may be the only way back from a mistake
- [ ] Add an environment export, so an environment can be saved before a risky change *(does not exist yet, as far as checked)*

## Step 6: Build, settings and staging

The hosting items (same site, hosting setup, staging, and the two hosting settings) wait until there is a domain and a name.

- [x] Make the API address configurable: `VITE_API_URL`, required for a build (see `frontend/.env.example`)
- [x] Make the allowed CORS origin configurable: `CORS_ORIGINS`, required in production (see `backend/.env.example`)
- [x] Set the login cookie to `secure: true`, so the backend has to be served over HTTPS
- [ ] Host frontend and backend on the same site, like `app.example.com` and `api.example.com`: the login cookie stays on `sameSite: 'strict'`, so login does not work across unrelated domains
- [x] Fix the 10 type errors so `npm run build` can pass. All were unused code
- [x] Add the missing backend packages to `backend/package.json`: `jsonwebtoken`, `bcrypt` and `cookie-parser` (and their types) were used but not listed, and were only found in `C:\Users\cosdi\node_modules`, outside the project
- [ ] Add the hosting setup: the repo has no Docker or CI configuration yet
- [ ] Set the security headers for the frontend at the hosting platform: `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`, `frame-ancestors 'none'` (or `X-Frame-Options: DENY`), and a `Content-Security-Policy` that allows the API address
- [ ] Set `TRUST_PROXY` on the hosting platform (usually `1`), or all users share one login limit
- [ ] Deploy to a staging environment

## Step 7: Start the pilot

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
