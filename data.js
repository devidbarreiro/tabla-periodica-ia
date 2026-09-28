/*
 * Tabla Periódica de la IA — datos.
 * Cada categoría ocupa una región de la tabla (como los bloques s, p, d y f).
 * Actualizada a septiembre de 2026.
 */
(function (root) {
  const UPDATED = "septiembre 2026";

  const CATEGORIES = [
    { id: "fund", name: "Fundamentos", color: "#e28e87" },
    { id: "arq", name: "Arquitecturas", color: "#e5a570" },
    { id: "train", name: "Entrenamiento", color: "#d8bf6a" },
    { id: "inf", name: "Inferencia", color: "#b0c46e" },
    { id: "multi", name: "Multimodal", color: "#86c08c" },
    { id: "rag", name: "RAG y datos", color: "#6fb3c9" },
    { id: "prompt", name: "Prompting y razonamiento", color: "#86a9e0" },
    { id: "eval", name: "Evaluación", color: "#a3a2e0" },
    { id: "safety", name: "Seguridad y gobernanza", color: "#b99bd2" },
    { id: "frontier", name: "Horizonte", color: "#d19cc6" },
    { id: "models", name: "Modelos frontera", color: "#dc94ae" },
    { id: "agents", name: "Serie agéntica", color: "#6cc4b4" },
  ];

  // Celdas [fila, columna] de cada región, en el orden en que se rellenan.
  const range = (from, to) => Array.from({ length: to - from + 1 }, (_, i) => from + i);
  const column = (col, rows) => rows.map((row) => [row, col]);
  const block = (cols, rows) => cols.flatMap((col) => column(col, rows));
  const rowCells = (row, cols) => cols.map((col) => [row, col]);

  const REGIONS = {
    fund: [[1, 1], ...column(1, range(2, 7)), ...column(2, range(2, 7))],
    arq: block(range(3, 5), range(4, 7)),
    train: block(range(6, 8), range(4, 7)),
    inf: block(range(9, 10), range(4, 7)),
    multi: block(range(11, 12), range(4, 7)),
    rag: column(13, range(2, 7)),
    prompt: column(14, range(2, 7)),
    eval: column(15, range(2, 7)),
    safety: block(range(16, 17), range(2, 7)),
    frontier: column(18, range(1, 7)),
    models: rowCells(9, range(3, 17)),
    agents: rowCells(10, range(3, 17)),
  };

  // s: símbolo · n: nombre · y: año de origen (null si no aplica) · d: descripción
  // hot: novedad 2025-2026 (punto de acento) · latest: última versión conocida (modelos)
  const TERMS = {
    fund: [
      { s: "Ia", n: "Inteligencia Artificial", y: 1956, d: "Campo que construye sistemas capaces de tareas que asociamos a la inteligencia humana: razonar, percibir, usar el lenguaje. El término nace en la conferencia de Dartmouth." },
      { s: "Ml", n: "Machine Learning", y: 1959, d: "Sistemas que aprenden patrones a partir de datos en lugar de seguir reglas programadas a mano. Arthur Samuel acuñó el término." },
      { s: "Dl", n: "Deep Learning", y: 2012, d: "Machine learning con redes neuronales de muchas capas. Despegó en 2012, cuando AlexNet arrasó en ImageNet entrenando con GPUs." },
      { s: "Nn", n: "Red neuronal", y: 1943, d: "Capas de «neuronas» artificiales que multiplican entradas por pesos y aplican una no linealidad. El primer modelo fue de McCulloch y Pitts." },
      { s: "Gd", n: "Descenso de gradiente", y: 1847, d: "Optimización que ajusta los pesos dando pequeños pasos en la dirección que más reduce el error. Lo describió Cauchy mucho antes de la IA." },
      { s: "Bp", n: "Backpropagation", y: 1986, d: "Cálculo eficiente del gradiente capa a capa, hacia atrás, con la regla de la cadena. Lo popularizaron Rumelhart, Hinton y Williams." },
      { s: "Lf", n: "Función de pérdida", y: null, d: "El número que mide cuánto se equivoca el modelo. Entrenar es minimizarla. En los LLMs suele ser la entropía cruzada del siguiente token." },
      { s: "Pa", n: "Parámetros", y: null, d: "Los pesos aprendidos del modelo. Se cuentan en miles de millones (B): un modelo «70B» tiene 70.000 millones." },
      { s: "Ds", n: "Dataset", y: null, d: "Datos de entrenamiento, validación y test. En la IA moderna su calidad pesa tanto como el tamaño del modelo." },
      { s: "Ov", n: "Overfitting", y: null, d: "El modelo memoriza los datos de entrenamiento y generaliza mal a datos nuevos. Se combate con regularización y más datos." },
      { s: "Sl", n: "Aprendizaje supervisado", y: null, d: "Aprender de ejemplos etiquetados (entrada → respuesta correcta). La base de la clasificación y la regresión." },
      { s: "Rl", n: "Aprendizaje por refuerzo", y: null, d: "Un agente aprende por prueba y error maximizando una recompensa. Está detrás de AlphaGo y del post-entrenamiento de los modelos de razonamiento." },
      { s: "Au", n: "Aprendizaje autosupervisado", y: 2018, d: "El propio dato genera la etiqueta: predecir la siguiente palabra o un trozo tapado. Así se preentrenan los LLMs sin etiquetar nada a mano." },
    ],
    arq: [
      { s: "Tf", n: "Transformer", y: 2017, d: "Arquitectura basada en atención, sin recurrencia, que procesa secuencias en paralelo. Nació en «Attention Is All You Need» y es la base de casi todos los LLMs." },
      { s: "At", n: "Atención", y: 2014, d: "Mecanismo que permite a cada token «mirar» a los demás y ponderar cuáles importan. Lo introdujeron Bahdanau et al. para traducción." },
      { s: "Em", n: "Embedding", y: 2013, d: "Vector que representa el significado de una palabra, frase o imagen: lo parecido queda cerca. word2vec lo popularizó." },
      { s: "Mo", n: "Mixture of Experts", y: 1991, d: "Muchas sub-redes expertas y un router que activa solo unas pocas por token: más parámetros totales con el mismo coste de inferencia." },
      { s: "Sm", n: "State Space Models", y: 2023, d: "Alternativa al Transformer con coste lineal en la longitud de la secuencia. Mamba es el ejemplo más conocido; hoy se combina en arquitecturas híbridas." },
      { s: "Cn", n: "CNN", y: 1989, d: "Redes convolucionales que detectan patrones locales en imágenes. LeCun las usó para leer dígitos; dominaron la visión durante una década." },
      { s: "Rn", n: "RNN", y: 1986, d: "Redes recurrentes que procesan secuencias paso a paso con un estado oculto. El Transformer las desplazó en lenguaje." },
      { s: "Ls", n: "LSTM", y: 1997, d: "RNN con puertas que recuerdan información durante muchos pasos. De Hochreiter y Schmidhuber; reinó en voz y traducción antes del Transformer." },
      { s: "Ga", n: "GAN", y: 2014, d: "Dos redes que compiten: un generador que falsifica y un discriminador que detecta. De Ian Goodfellow; trajo las primeras caras sintéticas realistas." },
      { s: "Df", n: "Difusión", y: 2020, d: "Modelos que aprenden a quitar ruido paso a paso hasta generar una imagen, un audio o un vídeo. DDPM (2020) los hizo prácticos." },
      { s: "Va", n: "VAE", y: 2013, d: "Autoencoder variacional: comprime datos en un espacio latente continuo del que se puede muestrear. Pieza clave de la «latent diffusion»." },
      { s: "Fm", n: "Flow matching", y: 2022, d: "Entrena generadores que transforman ruido en datos siguiendo un flujo continuo. Base de muchos modelos actuales de imagen y vídeo." },
    ],
    train: [
      { s: "Pt", n: "Preentrenamiento", y: null, d: "La fase masiva: predecir el siguiente token sobre billones de tokens. Ahí el modelo adquiere su conocimiento general." },
      { s: "Ft", n: "Fine-tuning", y: null, d: "Seguir entrenando un modelo ya preentrenado con datos específicos para adaptarlo a una tarea, un dominio o un estilo." },
      { s: "Sf", n: "SFT", y: 2022, d: "Supervised Fine-Tuning con pares instrucción → respuesta ideal. El primer paso para convertir un modelo base en asistente (InstructGPT)." },
      { s: "Rh", n: "RLHF", y: 2017, d: "Refuerzo con feedback humano: se comparan respuestas, se entrena un modelo de recompensa y se optimiza el LLM contra él. Clave en ChatGPT." },
      { s: "Dp", n: "DPO", y: 2023, d: "Direct Preference Optimization: aprende de pares preferido/rechazado sin modelo de recompensa ni RL explícito. Más simple y estable que RLHF." },
      { s: "Gr", n: "GRPO", y: 2024, d: "Group Relative Policy Optimization: RL que compara un grupo de respuestas entre sí en lugar de usar un crítico. Lo popularizó DeepSeek-R1." },
      { s: "Lo", n: "LoRA", y: 2021, d: "Low-Rank Adaptation: en vez de tocar todos los pesos, entrena pequeñas matrices añadidas. Fine-tuning barato; QLoRA lo combina con cuantización." },
      { s: "Kd", n: "Destilación", y: 2015, d: "Un modelo pequeño (alumno) aprende a imitar las salidas de uno grande (profesor). Así nacen los modelos «mini» y «flash»." },
      { s: "Sy", n: "Datos sintéticos", y: null, d: "Datos de entrenamiento generados por otros modelos. Hoy son esenciales para razonamiento, código y post-entrenamiento." },
      { s: "Ca", n: "IA constitucional", y: 2022, d: "Método de Anthropic: el modelo se critica y corrige siguiendo una lista de principios escritos (una «constitución») además del feedback humano." },
      { s: "Rv", n: "RLVR", y: 2024, hot: true, d: "RL con recompensas verificables: premia un verificador automático (tests que pasan, resultado matemático correcto). El motor de los modelos de razonamiento." },
      { s: "Sc", n: "Leyes de escalado", y: 2020, d: "El error baja de forma predecible al aumentar parámetros, datos y cómputo. Kaplan et al. (2020) y Chinchilla (2022)." },
    ],
    inf: [
      { s: "Tk", n: "Token", y: null, d: "La unidad mínima que procesa un LLM: un trozo de palabra. En inglés, unos ¾ de palabra. Todo se mide y se cobra en tokens." },
      { s: "Cw", n: "Ventana de contexto", y: null, d: "Cuántos tokens puede «ver» el modelo a la vez: prompt, historial y respuesta. Los modelos frontera ya trabajan con 1M de tokens." },
      { s: "Kv", n: "KV cache", y: null, d: "Guarda las claves y valores de atención de los tokens ya procesados para no recalcularlos al generar cada token nuevo." },
      { s: "Qz", n: "Cuantización", y: null, d: "Reducir la precisión de los pesos (de 16 bits a 8, 4 o menos) para que el modelo ocupe menos y vaya más rápido con poca pérdida." },
      { s: "Sd", n: "Decodificación especulativa", y: 2022, d: "Un modelo pequeño propone varios tokens y el grande los verifica de una vez. Misma salida, bastante más rápido." },
      { s: "Te", n: "Temperatura", y: null, d: "Controla la aleatoriedad al muestrear: baja es predecible y precisa; alta, creativa y variada. Suele ir junto a top-p." },
      { s: "Tc", n: "Test-time compute", y: 2024, hot: true, d: "Escalar el cómputo al responder (pensar más, muestrear varias veces) y no solo al entrenar. La nueva ley de escalado." },
      { s: "Pc", n: "Prompt caching", y: 2024, d: "Reutilizar entre llamadas el prefijo ya procesado de un prompt. Abarata y acelera muchísimo agentes y chats largos." },
    ],
    multi: [
      { s: "Mm", n: "Multimodal", y: null, d: "Modelos que entienden o generan varios tipos de dato a la vez: texto, imagen, audio y vídeo." },
      { s: "Vl", n: "VLM", y: 2021, d: "Vision-Language Model: un codificador de imagen unido a un LLM para describir y razonar sobre imágenes. CLIP abrió el camino." },
      { s: "Tt", n: "Text-to-Speech", y: null, d: "Síntesis de voz a partir de texto. Los modelos actuales clonan timbres y expresan emoción de forma casi indistinguible de una persona." },
      { s: "As", n: "ASR", y: null, d: "Reconocimiento automático del habla: de audio a texto. Whisper (2022) lo hizo abierto, multilingüe y robusto." },
      { s: "Ti", n: "Texto a imagen", y: 2021, d: "Generar imágenes a partir de una descripción. DALL·E (2021), Stable Diffusion, Midjourney, FLUX…" },
      { s: "Tv", n: "Texto a vídeo", y: 2024, d: "Generar clips de vídeo desde texto o imagen, cada vez más con audio sincronizado. Sora, Veo, Kling…" },
      { s: "Ss", n: "Speech-to-speech", y: 2024, hot: true, d: "Modelos de voz nativos que escuchan y responden en audio sin pasar por texto, con latencia de conversación real." },
      { s: "Wm", n: "World models", y: 2018, hot: true, d: "Modelos que aprenden una simulación del mundo y predicen qué pasa después. Clave para robótica, vídeo interactivo y agentes." },
    ],
    rag: [
      { s: "Rg", n: "RAG", y: 2020, d: "Retrieval-Augmented Generation: buscar documentos relevantes y pasarlos como contexto antes de responder. Menos alucinación y datos propios." },
      { s: "Vd", n: "Base vectorial", y: null, d: "Almacena embeddings y encuentra los más parecidos por similitud. pgvector, Qdrant, Pinecone, Weaviate…" },
      { s: "Ch", n: "Chunking", y: null, d: "Trocear documentos en fragmentos para indexarlos. El tamaño y la estrategia del troceo deciden la calidad de un RAG." },
      { s: "Rr", n: "Reranking", y: null, d: "Segunda pasada que reordena los resultados recuperados con un modelo más preciso antes de dárselos al LLM." },
      { s: "Hy", n: "Búsqueda híbrida", y: null, d: "Combina búsqueda semántica (vectores) y léxica (BM25, palabras clave). Lo mejor de ambos mundos." },
      { s: "Kg", n: "GraphRAG", y: 2024, d: "RAG sobre un grafo de conocimiento: entidades y relaciones extraídas del corpus para responder preguntas globales. Propuesto por Microsoft." },
    ],
    prompt: [
      { s: "Pr", n: "Prompt", y: null, d: "La entrada que le das al modelo: instrucciones, contexto, ejemplos y formato de salida esperado." },
      { s: "Si", n: "System prompt", y: null, d: "Instrucciones de alto nivel que fijan rol, reglas y tono. Van antes de los mensajes del usuario." },
      { s: "Fs", n: "Few-shot", y: 2020, d: "Incluir unos pocos ejemplos en el prompt para que el modelo imite el patrón. GPT-3 demostró que funcionaba sin reentrenar." },
      { s: "Ct", n: "Chain-of-Thought", y: 2022, d: "Inducir razonamiento paso a paso antes de la respuesta final. Mejora mucho en matemáticas y lógica." },
      { s: "Ce", n: "Context engineering", y: 2025, hot: true, d: "La evolución del prompt engineering: diseñar todo lo que entra en el contexto (herramientas, memoria, documentos, historial) para que el agente acierte." },
      { s: "Rz", n: "Modelo de razonamiento", y: 2024, hot: true, d: "Modelos entrenados para pensar antes de responder, con un presupuesto de razonamiento ajustable. Llegaron con o1 (2024) y hoy son el estándar." },
    ],
    eval: [
      { s: "Bm", n: "Benchmark", y: null, d: "Conjunto de pruebas estandarizado para comparar modelos. Se saturan rápido: lo difícil es medir lo que importa." },
      { s: "Sw", n: "SWE-bench", y: 2023, d: "Issues reales de GitHub que el modelo debe resolver con un parche que pase los tests. La referencia de los agentes de código." },
      { s: "Hl", n: "Humanity's Last Exam", y: 2025, hot: true, d: "Miles de preguntas de nivel experto en decenas de disciplinas, diseñadas como el último gran examen académico para la IA." },
      { s: "Rc", n: "ARC-AGI", y: 2019, d: "Puzles visuales de François Chollet que miden la adaptación a problemas nuevos con pocos ejemplos. Fáciles para humanos, duros para la IA." },
      { s: "Lj", n: "LLM-as-judge", y: 2023, d: "Un LLM puntúa las respuestas de otro según una rúbrica. Escala la evaluación, pero hay que calibrarlo." },
      { s: "Ev", n: "Evals", y: null, d: "Tus propios tests para tu caso de uso: datasets, rúbricas y métricas que corren en cada cambio. Los unit tests de la IA." },
    ],
    safety: [
      { s: "Al", n: "Alineamiento", y: null, d: "Conseguir que la IA haga lo que pretendemos y respete valores humanos, incluso cuando sea más capaz que nosotros." },
      { s: "Ha", n: "Alucinación", y: null, d: "El modelo genera información falsa con total seguridad. Se mitiga con RAG, citas, verificación y modelos mejor calibrados." },
      { s: "Pi", n: "Prompt injection", y: 2022, d: "Instrucciones maliciosas escondidas en datos (una web, un email, un PDF) que secuestran al modelo. El riesgo número uno de los agentes." },
      { s: "Jb", n: "Jailbreak", y: null, d: "Técnicas para saltarse las salvaguardas del modelo y obtener respuestas que debería rechazar." },
      { s: "Re", n: "Red teaming", y: null, d: "Atacar el modelo a propósito, con humanos u otros modelos, para encontrar fallos antes que los malos." },
      { s: "Ip", n: "Interpretabilidad", y: null, d: "Abrir la caja negra: entender qué circuitos internos de la red implementan cada comportamiento." },
      { s: "Sa", n: "Sparse autoencoders", y: 2023, d: "Técnica de interpretabilidad que descompone las activaciones en «features» comprensibles: conceptos dentro del modelo." },
      { s: "Gu", n: "Guardrails", y: null, d: "Capas de control alrededor del modelo que filtran entradas y salidas: datos personales, temas vetados, formato, políticas." },
      { s: "Rsp", n: "Escalado responsable", y: 2023, d: "Políticas públicas que atan el despliegue de modelos más capaces a evaluaciones de riesgo y salvaguardas. Anthropic publicó la suya en 2023." },
      { s: "Ea", n: "AI Act", y: 2024, d: "Reglamento europeo de IA: clasifica los sistemas por nivel de riesgo y fija obligaciones a los modelos de propósito general. Se aplica de forma escalonada." },
      { s: "Hi", n: "Human-in-the-loop", y: null, d: "Un humano revisa o aprueba las acciones críticas (pagos, borrados, envíos) antes de que se ejecuten." },
      { s: "Cd", n: "Model card", y: 2019, d: "Documento que describe un modelo: datos, capacidades, límites y evaluaciones. Las «system cards» lo amplían para los modelos frontera." },
    ],
    frontier: [
      { s: "Agi", n: "AGI", y: null, d: "Inteligencia artificial general: un sistema capaz de igualar a una persona en la mayoría de tareas cognitivas. No hay definición consensuada." },
      { s: "Asi", n: "Superinteligencia", y: null, d: "IA que supera ampliamente a los mejores humanos en casi todos los dominios. El horizonte que motiva la investigación en seguridad." },
      { s: "Rsi", n: "Auto-mejora recursiva", y: 1965, d: "Una IA que mejora su propio diseño y acelera cada ciclo. I. J. Good lo llamó «explosión de inteligencia»." },
      { s: "Ei", n: "IA encarnada", y: null, hot: true, d: "IA con cuerpo: robots y humanoides que perciben y actúan en el mundo físico, a menudo con modelos visión-lenguaje-acción (VLA)." },
      { s: "Ow", n: "Open weights", y: 2023, d: "Modelos cuyos pesos se publican para ejecutarlos en local. Llama los popularizó; hoy muchos de los mejores abiertos vienen de China." },
      { s: "Sv", n: "IA soberana", y: 2024, d: "Países y regiones que construyen su propia infraestructura, datos y modelos para no depender de terceros." },
      { s: "Od", n: "IA en el dispositivo", y: null, d: "Modelos que corren en el móvil o el portátil sin nube: privacidad, latencia mínima y coste marginal cero." },
    ],
    models: [
      { s: "Cl", n: "Claude", y: 2023, org: "Anthropic", latest: "Opus 5.5 (22 sep 2026) · Fable 5.1 (1 sep 2026)", d: "La familia de Anthropic, referencia en código y agentes." },
      { s: "Gp", n: "GPT", y: 2018, org: "OpenAI", latest: "GPT-6 Sol y Luna (22 sep 2026)", d: "La familia que desató el boom con ChatGPT en noviembre de 2022." },
      { s: "Gm", n: "Gemini", y: 2023, org: "Google", latest: "Gemini 3.8 Flash (2 sep 2026)", d: "Multimodal nativo e integrado en todo el ecosistema de Google." },
      { s: "Gk", n: "Grok", y: 2023, org: "xAI", latest: "Grok 4.7 (21 sep 2026)", d: "Los modelos de xAI, integrados en X." },
      { s: "Mu", n: "Muse", y: null, org: "Meta", latest: "Muse Spark 1.3 (2 sep 2026)", d: "Familia de modelos de Meta." },
      { s: "Ll", n: "Llama", y: 2023, org: "Meta", d: "Los modelos abiertos que popularizaron los open weights." },
      { s: "Dk", n: "DeepSeek", y: 2023, org: "DeepSeek", d: "Laboratorio chino cuyo R1 (enero 2025) rivalizó con los mejores razonadores con pesos abiertos y un coste muy inferior." },
      { s: "Qw", n: "Qwen", y: 2023, org: "Alibaba", latest: "Qwen3.8-Omni-Flash (18 sep 2026)", d: "La familia abierta de Alibaba, de las más descargadas del mundo." },
      { s: "Mi", n: "Mistral", y: 2023, org: "Mistral AI", d: "El laboratorio europeo de referencia, con sede en París." },
      { s: "Km", n: "Kimi", y: 2023, org: "Moonshot AI", d: "Modelos chinos abiertos, conocidos por el contexto largo y las capacidades agénticas." },
      { s: "Gl", n: "GLM", y: null, org: "Z.ai", d: "Familia china de modelos abiertos de Z.ai (antes Zhipu), fuerte en código y agentes." },
      { s: "Mx", n: "MiMo", y: 2025, org: "Xiaomi", latest: "MiMo-V2.6 Pro y Flash (22 sep 2026)", d: "Los modelos de Xiaomi, centrados en razonamiento y eficiencia." },
      { s: "Fx", n: "FLUX", y: 2024, org: "Black Forest Labs", latest: "FLUX 3 Action (23 sep 2026)", d: "Generadores de imagen de los creadores originales de Stable Diffusion." },
      { s: "Ve", n: "Veo", y: 2024, org: "Google DeepMind", d: "Generación de vídeo de Google DeepMind, con audio nativo." },
      { s: "Sr", n: "Sora", y: 2024, org: "OpenAI", d: "El modelo de vídeo con el que OpenAI enseñó al mundo el texto a vídeo realista." },
    ],
    agents: [
      { s: "Ag", n: "Agente", y: null, d: "Un LLM que actúa en bucle: decide, usa herramientas, observa el resultado y sigue hasta cumplir un objetivo." },
      { s: "Tu", n: "Tool use", y: 2023, d: "Function calling: el modelo emite llamadas estructuradas a funciones o APIs; tu código las ejecuta y le devuelve el resultado." },
      { s: "Mcp", n: "Model Context Protocol", y: 2024, hot: true, d: "Estándar abierto de Anthropic (noviembre 2024) para conectar modelos con herramientas y datos. El «USB-C de la IA», hoy adoptado por toda la industria." },
      { s: "A2a", n: "Agent2Agent", y: 2025, hot: true, d: "Protocolo abierto lanzado por Google en 2025 para que agentes de distintos proveedores se descubran y colaboren." },
      { s: "Cu", n: "Computer use", y: 2024, hot: true, d: "El agente maneja un ordenador como una persona: ve la pantalla, mueve el ratón y teclea. Anthropic lo lanzó en octubre de 2024." },
      { s: "Ra", n: "ReAct", y: 2022, d: "Razonar y actuar intercalados: piensa, llama a una herramienta, observa y vuelve a pensar. El bucle base de los agentes." },
      { s: "Ma", n: "Multiagente", y: null, d: "Varios agentes especializados que colaboran o se reparten el trabajo bajo un orquestador." },
      { s: "Sb", n: "Subagentes", y: 2025, hot: true, d: "El agente principal delega tareas en agentes hijos con su propio contexto limpio y solo recibe el resumen." },
      { s: "Me", n: "Memoria", y: null, d: "Persistir información entre sesiones: preferencias, hechos y aprendizajes que el agente recupera cuando los necesita." },
      { s: "Sk", n: "Agent Skills", y: 2025, hot: true, d: "Carpetas con instrucciones, scripts y recursos que el agente carga solo cuando la tarea lo pide. Anthropic las lanzó en octubre de 2025." },
      { s: "Vc", n: "Vibe coding", y: 2025, hot: true, d: "Programar describiendo lo que quieres y aceptando lo que genera la IA sin leer el código. Término de Andrej Karpathy (febrero 2025)." },
      { s: "Ac", n: "Agentic coding", y: 2025, hot: true, d: "Agentes que leen el repo, editan archivos, ejecutan tests y abren PRs de forma autónoma: Claude Code, Codex, Cursor…" },
      { s: "Br", n: "Browser agents", y: 2025, hot: true, d: "Agentes que navegan webs, rellenan formularios y completan tareas por ti dentro de un navegador." },
      { s: "Co", n: "Comercio agéntico", y: 2025, hot: true, d: "Agentes que buscan, comparan y pagan en nombre del usuario, con protocolos de pago pensados para agentes." },
      { s: "Lr", n: "Agentes de larga duración", y: 2025, hot: true, d: "Agentes que trabajan horas o días en segundo plano, con checkpoints, memoria y revisión humana puntual." },
    ],
  };

  const byReadingOrder = (a, b) => a.row - b.row || a.col - b.col;

  const placed = CATEGORIES.flatMap((cat) => {
    const cells = REGIONS[cat.id];
    const terms = TERMS[cat.id];
    if (cells.length !== terms.length) {
      throw new Error(`Categoría ${cat.id}: ${terms.length} términos para ${cells.length} celdas`);
    }
    return terms.map((term, i) => ({ ...term, cat: cat.id, row: cells[i][0], col: cells[i][1] }));
  });

  const ELEMENTS = [...placed].sort(byReadingOrder).map((el, i) => ({ ...el, num: i + 1 }));

  const symbols = new Set(ELEMENTS.map((el) => el.s));
  if (symbols.size !== ELEMENTS.length) throw new Error("Hay símbolos duplicados");

  const DATA = Object.freeze({ UPDATED, CATEGORIES, ELEMENTS });

  if (typeof module !== "undefined" && module.exports) module.exports = DATA;
  else root.AI_TABLE = DATA;
})(typeof window !== "undefined" ? window : globalThis);
