import { supabase } from './shared-ui-stadium.js'

document.addEventListener('DOMContentLoaded', async () => {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const userId = user.id

  // Fetch stadium & manager level
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('manager_level, stadium_level')
    .eq('id', userId)
    .single()

  if (error || !profile) {
    console.error('Error loading stadium data', error)
    return
  }

  const levels = [
    { name: "Local Ground", capacity: 3000, revenue: 300, cost: 4000, requiredLevel: "Professional" },
    { name: "City Arena", capacity: 7000, revenue: 700, cost: 8000, requiredLevel: "Supreme" },
    { name: "National Stadium", capacity: 15000, revenue: 1500, cost: 16000, requiredLevel: "World Class" },
    { name: "Grand Dome", capacity: 30000, revenue: 3000, cost: 30000, requiredLevel: "Ultimate" },
    { name: "Boss Arena", capacity: 50000, revenue: 5000, cost: null, requiredLevel: "Titan" }
  ]

  let currentLevel = profile.stadium_level || 0
  const managerLevel = profile.manager_level

  const current = levels[currentLevel]
  const next = levels[currentLevel + 1]

  document.getElementById('stadium-level').textContent = current.name
  document.getElementById('stadium-capacity').textContent = current.capacity
  document.getElementById('stadium-revenue').textContent = current.revenue
  document.getElementById('stadium-upgrade-cost').textContent = next ? next.cost : "Max"
  document.getElementById('required-manager-level').textContent = next ? next.requiredLevel : "Max"

  // Disable button if maxed
  const upgradeBtn = document.getElementById('upgrade-btn')
  if (!next) {
    upgradeBtn.disabled = true
    upgradeBtn.textContent = "Max Level Reached"
    return
  }

  // On click upgrade
  upgradeBtn.addEventListener('click', async () => {
    const allowedLevels = [
      "Beginner", "Expert", "Professional", "Master", "Supreme", "World Class", "Ultimate", "Titan", "The Boss"
    ]

    const managerIndex = allowedLevels.indexOf(managerLevel)
    const requiredIndex = allowedLevels.indexOf(next.requiredLevel)

    if (managerIndex < requiredIndex) {
      alert(`You need to be at least ${next.requiredLevel} to upgrade.`)
      return
    }

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ stadium_level: currentLevel + 1 })
      .eq('id', userId)

    if (updateError) {
      alert('Upgrade failed.')
    } else {
      location.reload()
    }
  })
})
