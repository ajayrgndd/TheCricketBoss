import { serve } from 'https://deno.land/std/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js'

serve(async (_req) => {
  const supabase = createClient(
    Deno.env.get('https://iukofcmatlfhfwcechdq.supabase.co')!,
    Deno.env.get('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml1a29mY21hdGxmaGZ3Y2VjaGRxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzQ1NzM4NCwiZXhwIjoyMDY5MDMzMzg0fQ.EtpYvjBs7yiTwreqsukK_I7BoK-UKZo3pF_odbzszmI')!
  )

  // 1. Fetch all players with their team_ids (adjust this to match your schema)
  const { data: players, error } = await supabase
    .from('players')
    .select('*')

  if (error) {
    console.error('Error fetching players:', error)
    return new Response('Error fetching players', { status: 500 })
  }

  // 2. Group players by team (to apply form distribution squad-wise)
  const teams = new Map<string, any[]>()
  for (const player of players) {
    const teamId = player.team_id
    if (!teams.has(teamId)) teams.set(teamId, [])
    teams.get(teamId)!.push(player)
  }

  // 3. Process each squad
  for (const [teamId, squad] of teams.entries()) {
    const total = squad.length
    const shuffled = squad.sort(() => 0.5 - Math.random())

    const counts = {
      Poor: Math.floor(0.2 * total),
      Average: Math.floor(0.4 * total),
      Good: Math.floor(0.3 * total),
      Excellent: total - (Math.floor(0.2 * total) + Math.floor(0.4 * total) + Math.floor(0.3 * total))
    }

    let i = 0
    for (const [form, count] of Object.entries(counts)) {
      for (let j = 0; j < count && i < total; j++) {
        shuffled[i].form = form
        i++
      }
    }

    // 4. Bulk update new form values
    const updates = shuffled.map(p => ({
      id: p.id,
      form: p.form
    }))

    const { error: updateError } = await supabase
      .from('players')
      .upsert(updates, { onConflict: 'id' })

    if (updateError) {
      console.error(`Error updating team ${teamId}:`, updateError)
    }
  }

  return new Response('Form updated for all players ✅', { status: 200 })
})
