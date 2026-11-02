// Copies only the allowed fields from a request body, so a patch cannot overwrite fields like environmentId
export function pickFields(body: Record<string, unknown>, fields: readonly string[]) {
    const patch: Record<string, unknown> = {};
    for(const field of fields) {
        if(body[field] !== undefined) patch[field] = body[field];
    }
    return patch;
}
