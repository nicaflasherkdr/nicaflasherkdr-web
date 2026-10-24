/**
 * Cloudflare Pages Function: /api/maintenance
 * Endpoint Serverless Edge untuk Sinkronisasi Status Maintenance Mode secara Global
 * Memungkinkan seluruh pengunjung di berbagai perangkat menerima status pemeliharaan
 * secara real-time dari Cloudflare KV atau file konfigurasi server.
 */

export async function onRequest(context) {
    const { request, env } = context;

    // Handle CORS Preflight
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

    const headers = {
        "Content-Type": "application/json; charset=utf-8",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0"
    };

    // ================= GET: BACA STATUS MAINTENANCE =================
    if (request.method === "GET") {
        // 1. Cek Cloudflare KV jika ada binding env.NICA_KV atau env.MAINTENANCE_KV
        const kv = env.NICA_KV || env.MAINTENANCE_KV;
        if (kv) {
            try {
                const stored = await kv.get("maintenance_config", "json");
                if (stored !== null && typeof stored === "object") {
                    return new Response(JSON.stringify(stored), { headers });
                }
            } catch (e) {}
        }

        // 2. Fallback: Baca static maintenance.json dari server publik
        try {
            const url = new URL(request.url);
            const staticRes = await fetch(new URL('/maintenance.json', url.origin));
            if (staticRes.ok) {
                const staticData = await staticRes.json();
                return new Response(JSON.stringify(staticData), { headers });
            }
        } catch (e) {}

        return new Response(JSON.stringify({
            globalMaintenance: false,
            message: "Server normal",
            source: "default"
        }), { headers });
    }

    // ================= POST: SIMPAN STATUS MAINTENANCE =================
    if (request.method === "POST") {
        try {
            const body = await request.json();
            const globalMaintenance = !!body.globalMaintenance;
            const message = body.message || "Server registrasi tools sedang dalam pemeliharaan rutin. Silakan hubungi admin via WhatsApp.";
            const config = {
                globalMaintenance,
                message,
                updated_at: new Date().toISOString()
            };

            // Simpan ke KV jika namespace Cloudflare KV terhubung
            const kv = env.NICA_KV || env.MAINTENANCE_KV;
            let savedToKV = false;
            if (kv) {
                try {
                    await kv.put("maintenance_config", JSON.stringify(config));
                    savedToKV = true;
                } catch (e) {}
            }

            return new Response(JSON.stringify({
                status: "success",
                data: config,
                savedToKV: savedToKV,
                message: savedToKV 
                    ? "Status maintenance tersimpan secara instan di Cloudflare Edge KV!" 
                    : "Status diterima. Sambungkan KV binding di Cloudflare Pages agar sinkron permanen di edge."
            }), { headers });

        } catch (err) {
            return new Response(JSON.stringify({
                status: "error",
                message: err.message || "Format request tidak valid"
            }), { status: 400, headers });
        }
    }

    return new Response(JSON.stringify({ status: "error", message: "Method not allowed" }), { status: 405, headers });
}
