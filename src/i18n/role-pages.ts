// Textos de las páginas de cada tipo de perfil, tomados de prototipo_home.html
// (sus traducciones a los 5 idiomas). Cambios respecto al prototipo: sin cifras ni
// testimonios de ejemplo, "gratis el primer año" en vez de "durante el lanzamiento",
// y las funciones que aún no existen marcadas como "Próximamente" (available: false).
import type { Locale } from "./config";
import type { Role } from "@/lib/auth/permissions";

export type RolePageContent = {
  eyebrow: string;
  whatYouCanDo: string;
  soon: string;
  ctaNote: string;
  roles: Record<Role, {
    title: string;
    lead: string;
    cta: string;
    heading: string;
    features: { title: string; text: string; available: boolean }[];
    ctaTitle: string;
    ctaButton: string;
  }>;
};

export const rolePages: Record<Locale, RolePageContent> = {
  "es": {
    "eyebrow": "Tipo de perfil",
    "whatYouCanDo": "Qué puedes hacer",
    "soon": "Próximamente",
    "ctaNote": "Es gratis el primer año y solo lleva un minuto.",
    "roles": {
      "fan": {
        "title": "Aficionado/a: tu ventana al *balonmano mundial*",
        "lead": "Sigue noticias, fichajes y debates de la comunidad, sin coste y sin necesidad de ser jugador/a ni profesional.",
        "cta": "Únete gratis",
        "heading": "Todo el balonmano, en un solo sitio",
        "features": [
          {
            "title": "Noticias al día",
            "text": "Toda la actualidad del balonmano mundial, filtrada por país y liga.",
            "available": false
          },
          {
            "title": "Alertas de fichajes",
            "text": "Entérate el primero de los movimientos de mercado en Move y Anuncios.",
            "available": false
          },
          {
            "title": "Foro de la comunidad",
            "text": "Debate con otros aficionados y profesionales, con una identidad anónima si lo prefieres.",
            "available": false
          },
          {
            "title": "Sigue a tus favoritos",
            "text": "Guarda jugadores, clubes y ligas para no perderte nada de lo que te interesa.",
            "available": true
          }
        ],
        "ctaTitle": "¿List@ para unirte a la comunidad?",
        "ctaButton": "Únete gratis como aficionado/a"
      },
      "player": {
        "title": "Jugador/a: enseña tu nivel al *mundo del balonmano*",
        "lead": "Crea tu perfil deportivo, sube tus highlights y aparece en Move para que los clubes te encuentren.",
        "cta": "Crear mi perfil gratis",
        "heading": "Todo lo que necesitas para que te fichen",
        "features": [
          {
            "title": "Perfil deportivo completo",
            "text": "Edad, altura, peso, mano dominante, disponibilidad y club actual, todo en un mismo sitio.",
            "available": true
          },
          {
            "title": "Selector de posiciones",
            "text": "Marca tu posición principal y secundaria en ataque y defensa sobre un diagrama interactivo.",
            "available": true
          },
          {
            "title": "Sube tus highlights",
            "text": "Comparte tus mejores vídeos para que los clubes vean tu nivel de un vistazo.",
            "available": true
          },
          {
            "title": "Aparece en Move",
            "text": "Recibe interés real de clubes y profesionales que buscan tu posición.",
            "available": true
          }
        ],
        "ctaTitle": "¿List@ para que te descubran?",
        "ctaButton": "Crear mi perfil de jugador/a gratis"
      },
      "professional": {
        "title": "Profesional: muestra tu *trayectoria y experiencia*",
        "lead": "Entrenadores/as, fisios, preparadores/as físicos, psicólogos/as, nutricionistas y agentes: comparte tu especialidad con clubes de todo el mundo.",
        "cta": "Crear mi perfil gratis",
        "heading": "Tu experiencia, visible para todo el sector",
        "features": [
          {
            "title": "Elige tu especialidad",
            "text": "Entrenador/a, preparador/a físico/a, fisioterapeuta, nutricionista, psicólogo/a o agente/representante.",
            "available": true
          },
          {
            "title": "Formación y logros",
            "text": "Comparte tu trayectoria, formación complementaria y logros más destacados.",
            "available": true
          },
          {
            "title": "Publica y recibe ofertas",
            "text": "Publica tu disponibilidad o postúlate directamente a las ofertas del Tablón de Anuncios.",
            "available": false
          },
          {
            "title": "Visible en Move",
            "text": "Aparece en las búsquedas de clubes que filtran por especialidad y país.",
            "available": true
          }
        ],
        "ctaTitle": "¿List@ para mostrar tu trayectoria?",
        "ctaButton": "Crear mi perfil profesional gratis"
      },
      "club": {
        "title": "Club: encuentra el *talento exacto* que necesitas",
        "lead": "Publica ofertas, filtra por posición y país, y contacta directamente con jugadores y profesionales disponibles.",
        "cta": "Registrar mi club gratis",
        "heading": "Encuentra a tu próximo fichaje más rápido",
        "features": [
          {
            "title": "Publica ofertas",
            "text": "Publica vacantes ilimitadas en el Tablón de Anuncios: jugadores, entrenadores/as o agentes.",
            "available": false
          },
          {
            "title": "Filtra por posición y país",
            "text": "Busca en Move por posición, país, categoría y disponibilidad, con filtros en cascada.",
            "available": true
          },
          {
            "title": "Recibe candidaturas",
            "text": "Los jugadores y profesionales interesados se postulan directamente a tus ofertas.",
            "available": false
          },
          {
            "title": "Perfil de club verificado",
            "text": "Muestra tu categoría, palmarés y proyecto deportivo con un perfil profesional.",
            "available": true
          }
        ],
        "ctaTitle": "¿Buscas tu próximo fichaje?",
        "ctaButton": "Registrar mi club gratis"
      }
    }
  },
  "en": {
    "eyebrow": "Profile type",
    "whatYouCanDo": "What you can do",
    "soon": "Coming soon",
    "ctaNote": "It's free for the first year and only takes a minute.",
    "roles": {
      "fan": {
        "title": "Fan: your window into *world handball*",
        "lead": "Follow news, transfers and community discussions, at no cost and without needing to be a player or professional.",
        "cta": "Join for free",
        "heading": "All of handball, in one place",
        "features": [
          {
            "title": "Up-to-date news",
            "text": "All the news from world handball, filtered by country and league.",
            "available": false
          },
          {
            "title": "Transfer alerts",
            "text": "Be the first to know about market moves on Move and Listings.",
            "available": false
          },
          {
            "title": "Community forum",
            "text": "Discuss with other fans and professionals, with an anonymous identity if you prefer.",
            "available": false
          },
          {
            "title": "Follow your favourites",
            "text": "Save players, clubs and leagues so you never miss what matters to you.",
            "available": true
          }
        ],
        "ctaTitle": "Ready to join the community?",
        "ctaButton": "Join for free as a fan"
      },
      "player": {
        "title": "Player: show your level to the *world of handball*",
        "lead": "Create your sports profile, upload your highlights and appear on Move so clubs can find you.",
        "cta": "Create my profile for free",
        "heading": "Everything you need to get signed",
        "features": [
          {
            "title": "Complete sports profile",
            "text": "Age, height, weight, dominant hand, availability and current club, all in one place.",
            "available": true
          },
          {
            "title": "Position selector",
            "text": "Mark your primary and secondary position in attack and defence on an interactive diagram.",
            "available": true
          },
          {
            "title": "Upload your highlights",
            "text": "Share your best videos so clubs can see your level at a glance.",
            "available": true
          },
          {
            "title": "Appear on Move",
            "text": "Get real interest from clubs and professionals looking for your position.",
            "available": true
          }
        ],
        "ctaTitle": "Ready to be discovered?",
        "ctaButton": "Create my player profile for free"
      },
      "professional": {
        "title": "Professional: showcase your *career and experience*",
        "lead": "Coaches, physios, fitness coaches, psychologists, nutritionists and agents: share your specialty with clubs around the world.",
        "cta": "Create my profile for free",
        "heading": "Your experience, visible to the whole industry",
        "features": [
          {
            "title": "Choose your specialty",
            "text": "Coach, fitness coach, physiotherapist, nutritionist, psychologist or agent/representative.",
            "available": true
          },
          {
            "title": "Training and achievements",
            "text": "Share your career path, further education and top achievements.",
            "available": true
          },
          {
            "title": "Post and receive offers",
            "text": "Post your availability or apply directly to offers on the Listings board.",
            "available": false
          },
          {
            "title": "Visible on Move",
            "text": "Appear in searches by clubs filtering by specialty and country.",
            "available": true
          }
        ],
        "ctaTitle": "Ready to showcase your career?",
        "ctaButton": "Create my professional profile for free"
      },
      "club": {
        "title": "Club: find the *exact talent* you need",
        "lead": "Post offers, filter by position and country, and contact available players and professionals directly.",
        "cta": "Register my club for free",
        "heading": "Find your next signing faster",
        "features": [
          {
            "title": "Post offers",
            "text": "Post unlimited openings on the Listings board: players, coaches or agents.",
            "available": false
          },
          {
            "title": "Filter by position and country",
            "text": "Search Move by position, country, category and availability, with cascading filters.",
            "available": true
          },
          {
            "title": "Receive applications",
            "text": "Interested players and professionals apply directly to your offers.",
            "available": false
          },
          {
            "title": "Verified club profile",
            "text": "Showcase your category, honours and sporting project with a professional profile.",
            "available": true
          }
        ],
        "ctaTitle": "Looking for your next signing?",
        "ctaButton": "Register my club for free"
      }
    }
  },
  "fr": {
    "eyebrow": "Type de profil",
    "whatYouCanDo": "Ce que vous pouvez faire",
    "soon": "Bientôt",
    "ctaNote": "C'est gratuit la première année et ça ne prend qu'une minute.",
    "roles": {
      "fan": {
        "title": "Supporter/rice : votre fenêtre sur le *handball mondial*",
        "lead": "Suivez actualités, transferts et débats de la communauté, gratuitement et sans avoir besoin d'être joueur/euse ni professionnel(le).",
        "cta": "Rejoindre gratuitement",
        "heading": "Tout le handball, en un seul endroit",
        "features": [
          {
            "title": "Actualités à jour",
            "text": "Toute l'actualité du handball mondial, filtrée par pays et championnat.",
            "available": false
          },
          {
            "title": "Alertes de transferts",
            "text": "Soyez informé(e) en premier des mouvements du marché sur Move et Annonces.",
            "available": false
          },
          {
            "title": "Forum de la communauté",
            "text": "Échangez avec d'autres supporters et professionnel(le)s, avec une identité anonyme si vous préférez.",
            "available": false
          },
          {
            "title": "Suivez vos favoris",
            "text": "Enregistrez joueurs, clubs et championnats pour ne rien manquer de ce qui vous intéresse.",
            "available": true
          }
        ],
        "ctaTitle": "Prêt(e) à rejoindre la communauté ?",
        "ctaButton": "Rejoignez gratuitement en tant que supporter/rice"
      },
      "player": {
        "title": "Joueur/euse : montrez votre niveau au *monde du handball*",
        "lead": "Créez votre profil sportif, ajoutez vos temps forts et apparaissez sur Move pour que les clubs vous trouvent.",
        "cta": "Créer mon profil gratuitement",
        "heading": "Tout ce dont vous avez besoin pour être recruté(e)",
        "features": [
          {
            "title": "Profil sportif complet",
            "text": "Âge, taille, poids, main dominante, disponibilité et club actuel, tout au même endroit.",
            "available": true
          },
          {
            "title": "Sélecteur de postes",
            "text": "Indiquez votre poste principal et secondaire en attaque et en défense sur un diagramme interactif.",
            "available": true
          },
          {
            "title": "Ajoutez vos temps forts",
            "text": "Partagez vos meilleures vidéos pour que les clubs voient votre niveau en un coup d'œil.",
            "available": true
          },
          {
            "title": "Apparaissez sur Move",
            "text": "Recevez de l'intérêt réel de la part de clubs et professionnel(le)s qui recherchent votre poste.",
            "available": true
          }
        ],
        "ctaTitle": "Prêt(e) à être découvert(e) ?",
        "ctaButton": "Créer mon profil de joueur/euse gratuitement"
      },
      "professional": {
        "title": "Professionnel(le) : montrez votre *parcours et votre expérience*",
        "lead": "Entraîneur(e)s, kinés, préparateurs/trices physiques, psychologues, nutritionnistes et agents : partagez votre spécialité avec des clubs du monde entier.",
        "cta": "Créer mon profil gratuitement",
        "heading": "Votre expérience, visible pour tout le secteur",
        "features": [
          {
            "title": "Choisissez votre spécialité",
            "text": "Entraîneur/euse, préparateur/trice physique, kinésithérapeute, nutritionniste, psychologue ou agent/représentant(e).",
            "available": true
          },
          {
            "title": "Formation et réalisations",
            "text": "Partagez votre parcours, votre formation complémentaire et vos réalisations marquantes.",
            "available": true
          },
          {
            "title": "Publiez et recevez des offres",
            "text": "Publiez votre disponibilité ou postulez directement aux offres du tableau d'annonces.",
            "available": false
          },
          {
            "title": "Visible sur Move",
            "text": "Apparaissez dans les recherches de clubs filtrant par spécialité et pays.",
            "available": true
          }
        ],
        "ctaTitle": "Prêt(e) à montrer votre parcours ?",
        "ctaButton": "Créer mon profil professionnel gratuitement"
      },
      "club": {
        "title": "Club : trouvez exactement le *talent* dont vous avez besoin",
        "lead": "Publiez des offres, filtrez par poste et pays, et contactez directement les joueurs/euses et professionnel(le)s disponibles.",
        "cta": "Enregistrer mon club gratuitement",
        "heading": "Trouvez votre prochaine recrue plus vite",
        "features": [
          {
            "title": "Publiez des offres",
            "text": "Publiez un nombre illimité d'offres sur le tableau d'annonces : joueurs, entraîneur(e)s ou agents.",
            "available": false
          },
          {
            "title": "Filtrez par poste et pays",
            "text": "Recherchez sur Move par poste, pays, catégorie et disponibilité, avec des filtres en cascade.",
            "available": true
          },
          {
            "title": "Recevez des candidatures",
            "text": "Les joueurs/euses et professionnel(le)s intéressé(e)s postulent directement à vos offres.",
            "available": false
          },
          {
            "title": "Profil de club vérifié",
            "text": "Présentez votre catégorie, votre palmarès et votre projet sportif avec un profil professionnel.",
            "available": true
          }
        ],
        "ctaTitle": "Vous cherchez votre prochaine recrue ?",
        "ctaButton": "Enregistrer mon club gratuitement"
      }
    }
  },
  "de": {
    "eyebrow": "Profiltyp",
    "whatYouCanDo": "Was du tun kannst",
    "soon": "Demnächst",
    "ctaNote": "Im ersten Jahr kostenlos – und in einer Minute erledigt.",
    "roles": {
      "fan": {
        "title": "Fan: dein Fenster zum *Welt-Handball*",
        "lead": "Verfolge Neuigkeiten, Transfers und Community-Diskussionen, kostenlos und ohne Spieler/in oder Fachperson sein zu müssen.",
        "cta": "Kostenlos beitreten",
        "heading": "Der gesamte Handball an einem Ort",
        "features": [
          {
            "title": "Aktuelle Nachrichten",
            "text": "Alle Neuigkeiten aus dem Welt-Handball, gefiltert nach Land und Liga.",
            "available": false
          },
          {
            "title": "Transfer-Benachrichtigungen",
            "text": "Erfahre als Erste/r von Marktbewegungen auf Move und Anzeigen.",
            "available": false
          },
          {
            "title": "Community-Forum",
            "text": "Diskutiere mit anderen Fans und Fachleuten, bei Bedarf mit anonymer Identität.",
            "available": false
          },
          {
            "title": "Folge deinen Favoriten",
            "text": "Speichere Spieler/innen, Vereine und Ligen, damit du nichts verpasst.",
            "available": true
          }
        ],
        "ctaTitle": "Bereit, der Community beizutreten?",
        "ctaButton": "Kostenlos als Fan beitreten"
      },
      "player": {
        "title": "Spieler/in: zeig dein Niveau der *Handballwelt*",
        "lead": "Erstelle dein Sportprofil, lade deine Highlights hoch und erscheine auf Move, damit Vereine dich finden.",
        "cta": "Mein Profil kostenlos erstellen",
        "heading": "Alles, was du brauchst, um verpflichtet zu werden",
        "features": [
          {
            "title": "Vollständiges Sportprofil",
            "text": "Alter, Größe, Gewicht, dominante Hand, Verfügbarkeit und aktueller Verein, alles an einem Ort.",
            "available": true
          },
          {
            "title": "Positionsauswahl",
            "text": "Markiere deine Haupt- und Nebenposition in Angriff und Abwehr auf einem interaktiven Diagramm.",
            "available": true
          },
          {
            "title": "Lade deine Highlights hoch",
            "text": "Teile deine besten Videos, damit Vereine dein Niveau auf einen Blick sehen.",
            "available": true
          },
          {
            "title": "Erscheine auf Move",
            "text": "Erhalte echtes Interesse von Vereinen und Fachleuten, die deine Position suchen.",
            "available": true
          }
        ],
        "ctaTitle": "Bereit, entdeckt zu werden?",
        "ctaButton": "Mein Spielerprofil kostenlos erstellen"
      },
      "professional": {
        "title": "Fachperson: zeig deinen *Werdegang und deine Erfahrung*",
        "lead": "Trainer/innen, Physios, Athletiktrainer/innen, Psycholog(inn)en, Ernährungsberater/innen und Agenten: teile deine Spezialisierung mit Vereinen weltweit.",
        "cta": "Mein Profil kostenlos erstellen",
        "heading": "Deine Erfahrung, sichtbar für die ganze Branche",
        "features": [
          {
            "title": "Wähle deine Spezialisierung",
            "text": "Trainer/in, Athletiktrainer/in, Physiotherapeut/in, Ernährungsberater/in, Psychologe/in oder Agent/in.",
            "available": true
          },
          {
            "title": "Ausbildung und Erfolge",
            "text": "Teile deinen Werdegang, deine Zusatzausbildung und deine größten Erfolge.",
            "available": true
          },
          {
            "title": "Veröffentliche und erhalte Angebote",
            "text": "Veröffentliche deine Verfügbarkeit oder bewirb dich direkt auf Angebote im Anzeigenbrett.",
            "available": false
          },
          {
            "title": "Sichtbar auf Move",
            "text": "Erscheine in Vereinssuchen, die nach Spezialisierung und Land filtern.",
            "available": true
          }
        ],
        "ctaTitle": "Bereit, deinen Werdegang zu zeigen?",
        "ctaButton": "Mein Fachprofil kostenlos erstellen"
      },
      "club": {
        "title": "Verein: finde genau das *Talent*, das du brauchst",
        "lead": "Veröffentliche Angebote, filtere nach Position und Land und kontaktiere verfügbare Spieler/innen und Fachleute direkt.",
        "cta": "Meinen Verein kostenlos registrieren",
        "heading": "Finde deinen nächsten Neuzugang schneller",
        "features": [
          {
            "title": "Angebote veröffentlichen",
            "text": "Veröffentliche unbegrenzt viele offene Stellen im Anzeigenbrett: Spieler/innen, Trainer/innen oder Agenten.",
            "available": false
          },
          {
            "title": "Nach Position und Land filtern",
            "text": "Suche auf Move nach Position, Land, Kategorie und Verfügbarkeit mit kaskadierenden Filtern.",
            "available": true
          },
          {
            "title": "Bewerbungen erhalten",
            "text": "Interessierte Spieler/innen und Fachleute bewerben sich direkt auf deine Angebote.",
            "available": false
          },
          {
            "title": "Verifiziertes Vereinsprofil",
            "text": "Zeige deine Kategorie, deine Titel und dein Sportprojekt mit einem professionellen Profil.",
            "available": true
          }
        ],
        "ctaTitle": "Suchst du deinen nächsten Neuzugang?",
        "ctaButton": "Meinen Verein kostenlos registrieren"
      }
    }
  },
  "pt": {
    "eyebrow": "Tipo de perfil",
    "whatYouCanDo": "O que pode fazer",
    "soon": "Em breve",
    "ctaNote": "É grátis durante o primeiro ano e leva apenas um minuto.",
    "roles": {
      "fan": {
        "title": "Adepto/a: a sua janela para o *andebol mundial*",
        "lead": "Siga notícias, transferências e debates da comunidade, sem custo e sem necessidade de ser jogador/a nem profissional.",
        "cta": "Junte-se grátis",
        "heading": "Todo o andebol, num só sítio",
        "features": [
          {
            "title": "Notícias em dia",
            "text": "Toda a atualidade do andebol mundial, filtrada por país e liga.",
            "available": false
          },
          {
            "title": "Alertas de transferências",
            "text": "Fique a saber em primeira mão os movimentos de mercado no Move e Anúncios.",
            "available": false
          },
          {
            "title": "Fórum da comunidade",
            "text": "Debata com outros adeptos e profissionais, com uma identidade anónima se preferir.",
            "available": false
          },
          {
            "title": "Siga os seus favoritos",
            "text": "Guarde jogadores, clubes e ligas para não perder nada do que lhe interessa.",
            "available": true
          }
        ],
        "ctaTitle": "Pronto/a para se juntar à comunidade?",
        "ctaButton": "Junte-se grátis como adepto/a"
      },
      "player": {
        "title": "Jogador/a: mostre o seu nível ao *mundo do andebol*",
        "lead": "Crie o seu perfil desportivo, carregue os seus destaques e apareça no Move para os clubes o encontrarem.",
        "cta": "Criar o meu perfil grátis",
        "heading": "Tudo o que precisa para ser contratado/a",
        "features": [
          {
            "title": "Perfil desportivo completo",
            "text": "Idade, altura, peso, mão dominante, disponibilidade e clube atual, tudo num só sítio.",
            "available": true
          },
          {
            "title": "Seletor de posições",
            "text": "Marque a sua posição principal e secundária em ataque e defesa num diagrama interativo.",
            "available": true
          },
          {
            "title": "Carregue os seus destaques",
            "text": "Partilhe os seus melhores vídeos para os clubes verem o seu nível rapidamente.",
            "available": true
          },
          {
            "title": "Apareça no Move",
            "text": "Receba interesse real de clubes e profissionais que procuram a sua posição.",
            "available": true
          }
        ],
        "ctaTitle": "Pronto/a para ser descoberto/a?",
        "ctaButton": "Criar o meu perfil de jogador/a grátis"
      },
      "professional": {
        "title": "Profissional: mostre a sua *trajetória e experiência*",
        "lead": "Treinadores/as, fisioterapeutas, preparadores/as físicos/as, psicólogos/as, nutricionistas e agentes: partilhe a sua especialidade com clubes de todo o mundo.",
        "cta": "Criar o meu perfil grátis",
        "heading": "A sua experiência, visível para todo o setor",
        "features": [
          {
            "title": "Escolha a sua especialidade",
            "text": "Treinador/a, preparador/a físico/a, fisioterapeuta, nutricionista, psicólogo/a ou agente/representante.",
            "available": true
          },
          {
            "title": "Formação e conquistas",
            "text": "Partilhe a sua trajetória, formação complementar e conquistas mais destacadas.",
            "available": true
          },
          {
            "title": "Publique e receba ofertas",
            "text": "Publique a sua disponibilidade ou candidate-se diretamente às ofertas do Mural de Anúncios.",
            "available": false
          },
          {
            "title": "Visível no Move",
            "text": "Apareça nas pesquisas de clubes que filtram por especialidade e país.",
            "available": true
          }
        ],
        "ctaTitle": "Pronto/a para mostrar a sua trajetória?",
        "ctaButton": "Criar o meu perfil profissional grátis"
      },
      "club": {
        "title": "Clube: encontre o *talento exato* que precisa",
        "lead": "Publique ofertas, filtre por posição e país, e contacte diretamente jogadores e profissionais disponíveis.",
        "cta": "Registar o meu clube grátis",
        "heading": "Encontre a sua próxima contratação mais rápido",
        "features": [
          {
            "title": "Publique ofertas",
            "text": "Publique vagas ilimitadas no Mural de Anúncios: jogadores, treinadores/as ou agentes.",
            "available": false
          },
          {
            "title": "Filtre por posição e país",
            "text": "Pesquise no Move por posição, país, categoria e disponibilidade, com filtros em cascata.",
            "available": true
          },
          {
            "title": "Receba candidaturas",
            "text": "Os jogadores e profissionais interessados candidatam-se diretamente às suas ofertas.",
            "available": false
          },
          {
            "title": "Perfil de clube verificado",
            "text": "Mostre a sua categoria, palmarés e projeto desportivo com um perfil profissional.",
            "available": true
          }
        ],
        "ctaTitle": "Procura a sua próxima contratação?",
        "ctaButton": "Registar o meu clube grátis"
      }
    }
  }
};
