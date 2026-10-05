// Page d'arrivée après connexion : l'espace client ou le dashboard pro.
// `suite` (page demandée avant la connexion) n'est suivie que si c'est un chemin interne du bon espace.
export function espaceDe(user, suite) {
  const accueil = user.type === 'client' ? '/client' : '/dashboard'
  const interne = suite?.startsWith('/') && !suite.startsWith('//')
  return interne && suite.startsWith(accueil) ? suite : accueil
}
