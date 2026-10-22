// Cloudflare Pages Serverless Function: /api/chat
// Berjalan otomatis di edge Cloudflare (Free Tier) tanpa perlu setup server sendiri.
// Menyembunyikan API Key dari pengunjung agar 100% aman.

export async function onRequestPost(context) {
    const { request, env } = context;

    const headers = {
        'Content-Type': 'application/json; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
    };

    try {
        const body = await request.json();
        const userPrompt = String(body.prompt || '').trim();

        if (!userPrompt) {
            return new Response(JSON.stringify({ error: 'Prompt tidak boleh kosong' }), { status: 400, headers });
        }

        const defaultSystem = `Anda adalah NicaAI Specialist, asisten virtual teknisi software smartphone di Nica Flasher Distrik Mojoroto, Kediri. Anda ahli dalam:
1. Flashing firmware & unbrick (EDL Qualcomm 9008, MediaTek Brom, Samsung Odin/DL, iPhone DFU/Recovery).
2. Bypass FRP Google Account, Mi Cloud Lock Clean, dan iPhone Bypass.
3. Menjelaskan perkiraan biaya secara transparan, waktu pengerjaan (15-60 menit), dan opsi remote via UltraViewer/AnyDesk atau langsung ke workshop Mojoroto.
Gunakan nada profesional, ramah, dan solutif. Format respons dengan rapi menggunakan poin-poin [ANALISIS], [METODE], dan [BIAYA].`;

        const systemPrompt = env.SYSTEM_PROMPT || defaultSystem;
        const geminiApiKey = env.GEMINI_API_KEY || '';
        const openaiApiKey = env.OPENAI_API_KEY || '';

        // 1. Prioritaskan Google Gemini API jika disetel di Cloudflare Pages Env
        if (geminiApiKey) {
            const candidates = [env.GEMINI_MODEL || 'gemini-2.0-flash', 'gemini-2.5-flash', 'gemini-1.5-flash-latest', 'gemini-1.5-flash', 'gemini-pro'];
            let lastErr = 'Gemini error';

            for (const model of candidates) {
                const cleanModel = model.replace(/^models\//, '');
                for (const apiVer of ['v1beta', 'v1']) {
                    try {
                        const res = await fetch(`https://generativelanguage.googleapis.com/${apiVer}/models/${cleanModel}:generateContent?key=${geminiApiKey}`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                contents: [
                                    { role: 'user', parts: [{ text: `${systemPrompt}\n\nPertanyaan Klien: ${userPrompt}` }] }
                                ]
                            })
                        });

                        const data = await res.json();
                        if (data.candidates && data.candidates[0]?.content?.parts[0]?.text) {
                            const reply = data.candidates[0].content.parts[0].text;
                            return new Response(JSON.stringify({ reply, modelUsed: cleanModel }), { status: 200, headers });
                        }
                        if (data.error) {
                            lastErr = data.error.message;
                            if (data.error.message.includes('not found') || data.error.message.includes('not supported') || data.error.code === 404) {
                                continue;
                            }
                        }
                    } catch (e) {
                        lastErr = e.message;
                    }
                }
            }

            return new Response(JSON.stringify({ error: lastErr }), { status: 502, headers });
        }

        // 2. Jika OpenAI API disetel
        if (openaiApiKey) {
            const res = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${openaiApiKey}`
                },
                body: JSON.stringify({
                    model: 'gpt-4o-mini',
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: userPrompt }
                    ]
                })
            });

            const data = await res.json();
            if (data.error) {
                return new Response(JSON.stringify({ error: data.error.message }), { status: 502, headers });
            }

            const reply = data.choices?.[0]?.message?.content || 'Tidak ada respon dari AI.';
            return new Response(JSON.stringify({ reply }), { status: 200, headers });
        }

        // 3. Jika belum disetel di Cloudflare Environment Variables
        return new Response(JSON.stringify({
            status: 'NO_BACKEND_KEY',
            message: 'API Key belum disetel di Cloudflare Pages Environment Variables. Klien menggunakan built-in engine.'
        }), { status: 200, headers });

    } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500, headers });
    }
}

export async function onRequestOptions() {
    return new Response(null, {
        status: 204,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type'
        }
    });
}
