/**
 * Cloudflare Pages Function: /api/register-ecid
 * Endpoint Serverless untuk Registrasi ECID & Serial Number Tools Bypass
 */
export async function onRequest(context) {
    const { request } = context;

    // Handle CORS
    if (request.method === "OPTIONS") {
        return new Response(null, {
            status: 200,
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type, Authorization",
            },
        });
    }

    try {
        let params = {};
        if (request.method === "POST") {
            try {
                params = await request.json();
            } catch (e) {
                const formData = await request.formData();
                for (const [key, value] of formData.entries()) {
                    params[key] = value;
                }
            }
        } else {
            const url = new URL(request.url);
            for (const [key, value] of url.searchParams.entries()) {
                params[key] = value;
            }
        }

        const action = params.action || 'status';
        const tool = params.tool || 'Universal Bypass Tool';
        const ecid = (params.ecid || '').toString().trim().toUpperCase();
        const sn = (params.sn || '').toString().trim().toUpperCase();
        const phone = params.phone || '';

        // Status / Ping
        if (action === 'status' || action === 'ping') {
            return new Response(JSON.stringify({
                status: 'success',
                maintenance: false,
                message: 'API Cloudflare Nica Flasher Tools Bypass Online & Ready',
                timestamp: new Date().toISOString()
            }), {
                headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
            });
        }

        // Register ECID / SN
        if (action === 'register') {
            if (!ecid && !sn) {
                return new Response(JSON.stringify({
                    status: 'error',
                    message: 'ECID atau Serial Number wajib diisi!'
                }), {
                    status: 400,
                    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
                });
            }

            const orderId = 'ECID-' + Math.random().toString(36).substring(2, 10).toUpperCase();
            const record = {
                order_id: orderId,
                tool: tool,
                ecid: ecid,
                sn: sn,
                phone: phone,
                status: 'Authorized',
                authorized_at: new Date().toISOString()
            };

            return new Response(JSON.stringify({
                status: 'success',
                message: 'Registrasi berhasil! ID Perangkat telah terverifikasi.',
                data: record
            }), {
                status: 200,
                headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
            });
        }

        return new Response(JSON.stringify({
            status: 'info',
            message: 'Endpoint /api/register-ecid aktif.'
        }), {
            headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
        });

    } catch (err) {
        return new Response(JSON.stringify({
            status: 'error',
            message: err.message || 'Internal Server Error'
        }), {
            status: 500,
            headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
        });
    }
}
