import { NextResponse } from 'next/server';

export const runtime = 'edge';

export async function POST(req) {
  try {
    const { record, apiKey, model = 'claude-3-haiku-20240307' } = await req.json();

    if (!apiKey) {
      return NextResponse.json({ error: 'Missing Anthropic API Key' }, { status: 400 });
    }

    const routingSummary = record.routing.kind === 'shelter'
      ? record.routing.allocations.map(a => `${a.mealsRouted} meals to ${a.districtName} (${a.distanceKm}km, currently ${a.coveragePct}% meal-covered)`).join('; ')
      : `${record.routing.energyEstimate} ${record.routing.energyUnit} at ${record.routing.facilityName} (${record.routing.distanceKm}km)`;

    const prompt = `You are explaining an automated food-waste routing decision to a hackathon judge in 1-2 short sentences. Source: ${record.sourceType} "${record.sourceName}". Item: ${record.weightKg}kg of ${record.category}, condition "${record.condition}". Classified: ${record.classification}. Routing decision: ${routingSummary}. Write a crisp, plain-language rationale a non-technical person would find convincing. No preamble.`;

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({ 
        model: model, 
        max_tokens: 150, 
        messages: [{ role: 'user', content: prompt }] 
      })
    });

    if (!res.ok) {
      const errorText = await res.text();
      return NextResponse.json({ error: `Claude API Error: ${res.status} ${errorText}` }, { status: 500 });
    }

    const data = await res.json();
    const text = data.content && data.content[0] && data.content[0].text;

    return NextResponse.json({ rationale: text.trim() });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
