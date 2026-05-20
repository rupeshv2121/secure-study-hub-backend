const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

(async () => {
    try {
        const c = fs.readFileSync('./.env', 'utf8');
        const env = c.split(/\r?\n/).reduce((a, line) => {
            const idx = line.indexOf('=');
            if (idx > 0) {
                const k = line.slice(0, idx).trim();
                let v = line.slice(idx + 1).trim();
                if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
                    v = v.slice(1, -1);
                }
                a[k] = v;
            }
            return a;
        }, {});

        const url = env.SUPABASE_URL;
        const key = env.SUPABASE_SERVICE_ROLE_KEY;
        if (!url || !key) {
            console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
            process.exit(1);
        }

        console.log('Using Supabase URL:', url);
        const sup = createClient(url, key);
        const res = await sup.storage.createBucket('lecture-slides', { public: false });
        console.log('createBucket result:', res);
    } catch (e) {
        console.error('error', e);
        process.exit(1);
    }
})();
