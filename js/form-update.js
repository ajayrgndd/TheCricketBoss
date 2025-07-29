function updatePlayerForms(squad) {
  const total = squad.length;
  const shuffled = squad.sort(() => 0.5 - Math.random());

  const counts = {
    Poor: Math.floor(0.20 * total),
    Average: Math.floor(0.40 * total),
    Good: Math.floor(0.30 * total),
    Excellent: total - (Math.floor(0.20 * total) + Math.floor(0.40 * total) + Math.floor(0.30 * total))
  };

  let i = 0;
  for (let [form, count] of Object.entries(counts)) {
    for (let j = 0; j < count; j++) {
      shuffled[i].form = form;
      i++;
    }
  }

  return shuffled;
}
