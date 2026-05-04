"use client"

import { useT, type Lang } from "../i18n"

type Faq = { q: string; a: string }

const t: Record<Lang, {
  title: string
  lead: string
  items: Faq[]
}> = {
  en: {
    title: "FAQ",
    lead: "Quick answers to the questions that come up most often.",
    items: [
      { q: "Is Agio live on mainnet?", a: "Not yet. The protocol is fully functional on Solana devnet today. Mainnet ship is on the roadmap, gated by an external audit." },
      { q: "How is Agio different from Aave or Compound?", a: "Aave and Compound are pooled lenders: every depositor shares risk in one big pot. Agio is peer-to-peer: each loan is a 1-to-1 contract with its own APY, duration, and collateral. A bad loan affects only the two parties on it." },
      { q: "How do I get devnet SOL and USDC to try the platform?", a: "SOL: any Solana devnet faucet (e.g. faucet.solana.com). Devnet USDC: use the in-app faucet button in the header (when on devnet) or any community devnet USDC faucet." },
      { q: "What tokens are supported?", a: "Devnet today runs USDC, EURC, and SOL (auto-wrapped to wSOL for collateral). Any SPL or Token-2022 mint with a Pyth feed can be added on mainnet." },
      { q: "What is the foreclosure threshold?", a: "If a loan's collateral ratio drops below 120%, the lender can foreclose. The acceptance floor is 130%, so loans start with at least 10% buffer above the trigger." },
      { q: "What happens if I repay a loan early?", a: "You still pay the full duration's interest. There is no early-repayment discount: lenders price expecting the full term." },
      { q: "What fees does the protocol charge?", a: "1% origination fee on every accepted loan (taken from the disbursed amount). Private offers via Cloak add a 0.5% privacy premium plus ZK proof costs (~0.005 SOL). MCP swap-tokens collects 0.05% of swap volume." },
      { q: "Are my loans visible on-chain?", a: "By default, yes: wallet, amount, terms, collateral are all public. Private Mode (powered by Cloak) replaces your wallet with a stealth address so observers see only the stealth, not you." },
      { q: "How do I cancel a pending offer?", a: "Open Loans, find your pending offer, click Rescind. Only the offer creator can rescind. Once accepted, the offer becomes a binding loan and cannot be cancelled — only repaid." },
      { q: "How do I connect an AI agent?", a: "Two paths: (1) point any MCP-capable client (Claude Desktop, Cursor, ChatGPT MCP, custom code) at https://app.agio.network/api/mcp, or (2) paste a one-line skill prompt into your agent. Full setup in AI Integration." },
      { q: "What is the Fairscale score on profiles?", a: "An external on-chain reputation score derived from publicly verifiable signals (loans repaid, foreclosures, volume, wallet age, social ties). Agio doesn't compute it — Fairscale does. The leaderboard ranks by this score." },
      { q: "Where can I report a bug?", a: "GitHub Issues at github.com/agionetwork/agio-private-lending/issues." },
    ],
  },
  es: {
    title: "FAQ",
    lead: "Respuestas rápidas a las preguntas más comunes.",
    items: [
      { q: "¿Está Agio activo en mainnet?", a: "Aún no. El protocolo es completamente funcional en Solana devnet hoy. El lanzamiento en mainnet está en el roadmap, dependiente de una auditoría externa." },
      { q: "¿En qué se diferencia Agio de Aave o Compound?", a: "Aave y Compound son prestamistas agrupados: cada depositante comparte riesgo en una sola olla grande. Agio es peer-to-peer: cada préstamo es un contrato 1-a-1 con su propio APY, duración y garantía. Un préstamo malo solo afecta a las dos partes que lo firmaron." },
      { q: "¿Cómo obtengo SOL y USDC de devnet para probar la plataforma?", a: "SOL: cualquier faucet de devnet de Solana (ej. faucet.solana.com). USDC devnet: usa el botón de faucet integrado en el header (cuando estés en devnet) o cualquier faucet comunitario." },
      { q: "¿Qué tokens están soportados?", a: "Devnet hoy corre USDC, EURC y SOL (envuelto automáticamente a wSOL como garantía). Cualquier mint SPL o Token-2022 con un feed Pyth puede añadirse en mainnet." },
      { q: "¿Cuál es el umbral de ejecución?", a: "Si el ratio de garantía de un préstamo cae por debajo del 120%, el prestamista puede ejecutar. El piso de aceptación es 130%, así que los préstamos comienzan con al menos 10% de margen sobre el gatillo." },
      { q: "¿Qué pasa si pago un préstamo antes de tiempo?", a: "Pagas igual el interés del plazo completo. No hay descuento por pago anticipado: los prestamistas ponen precio esperando el plazo completo." },
      { q: "¿Qué tarifas cobra el protocolo?", a: "1% de comisión de originación en cada préstamo aceptado (tomada del monto desembolsado). Las ofertas privadas vía Cloak añaden un 0,5% de premium de privacidad más costos de prueba ZK (~0,005 SOL). MCP swap-tokens cobra 0,05% del volumen del swap." },
      { q: "¿Mis préstamos son visibles on-chain?", a: "Por defecto, sí: wallet, monto, términos y garantía son todos públicos. El Modo Privado (impulsado por Cloak) reemplaza tu wallet con una dirección stealth, así los observadores solo ven la stealth, no a ti." },
      { q: "¿Cómo cancelo una oferta pendiente?", a: "Abre Préstamos, encuentra tu oferta pendiente, haz clic en Rescindir. Solo el creador de la oferta puede rescindir. Una vez aceptada, la oferta se vuelve un préstamo vinculante y no puede cancelarse — solo pagarse." },
      { q: "¿Cómo conecto un agente IA?", a: "Dos caminos: (1) apunta cualquier cliente compatible con MCP (Claude Desktop, Cursor, ChatGPT MCP, código personalizado) a https://app.agio.network/api/mcp, o (2) pega un prompt de una línea de la skill en tu agente. Setup completo en Integración IA." },
      { q: "¿Qué es el score Fairscale en los perfiles?", a: "Un score de reputación externo on-chain derivado de señales públicamente verificables (préstamos pagados, ejecuciones, volumen, antigüedad de wallet, lazos sociales). Agio no lo calcula — Fairscale sí. El leaderboard ordena por este score." },
      { q: "¿Dónde reporto un bug?", a: "GitHub Issues en github.com/agionetwork/agio-private-lending/issues." },
    ],
  },
  pt: {
    title: "FAQ",
    lead: "Respostas rápidas para as perguntas mais comuns.",
    items: [
      { q: "A Agio está no mainnet?", a: "Ainda não. O protocolo é totalmente funcional na Solana devnet hoje. O lançamento mainnet está no roadmap, condicionado a uma auditoria externa." },
      { q: "Como a Agio se diferencia da Aave ou Compound?", a: "Aave e Compound são credores em pool: todo depositante compartilha risco numa panela grande. A Agio é peer-to-peer: cada empréstimo é um contrato 1-a-1 com seu próprio APY, duração e garantia. Um empréstimo ruim afeta só as duas partes envolvidas." },
      { q: "Como pego SOL e USDC de devnet pra testar a plataforma?", a: "SOL: qualquer faucet de devnet da Solana (ex. faucet.solana.com). USDC devnet: use o botão de faucet integrado no header (quando estiver em devnet) ou qualquer faucet comunitário." },
      { q: "Quais tokens são aceitos?", a: "A devnet hoje roda USDC, EURC e SOL (convertido automaticamente para wSOL como garantia). Qualquer mint SPL ou Token-2022 com um feed Pyth pode ser adicionado no mainnet." },
      { q: "Qual é o gatilho de execução?", a: "Se a taxa de garantia de um empréstimo cair abaixo de 120%, o credor pode executar. O piso de aceitação é 130%, então empréstimos começam com pelo menos 10% de folga sobre o gatilho." },
      { q: "O que acontece se eu pagar um empréstimo antes do prazo?", a: "Você paga ainda assim o juro do prazo completo. Não há desconto por pagamento antecipado: credores precificam esperando o prazo inteiro." },
      { q: "Quais taxas o protocolo cobra?", a: "1% de taxa de originação em todo empréstimo aceito (descontada do valor desembolsado). Ofertas privadas via Cloak adicionam 0,5% de premium de privacidade mais custos de prova ZK (~0,005 SOL). MCP swap-tokens cobra 0,05% do volume do swap." },
      { q: "Meus empréstimos são visíveis on-chain?", a: "Por padrão, sim: wallet, valor, termos e garantia são todos públicos. O Modo Privado (com Cloak) substitui sua wallet por um endereço stealth, então observadores só veem a stealth, não você." },
      { q: "Como cancelo uma oferta pendente?", a: "Abra Empréstimos, ache sua oferta pendente, clique Rescindir. Só o criador da oferta pode rescindir. Uma vez aceita, a oferta vira um empréstimo vinculante e não pode ser cancelada — só paga." },
      { q: "Como conecto um agente IA?", a: "Dois caminhos: (1) aponte qualquer cliente compatível com MCP (Claude Desktop, Cursor, ChatGPT MCP, código próprio) para https://app.agio.network/api/mcp, ou (2) cole um prompt de uma linha da skill no seu agente. Setup completo em Integração IA." },
      { q: "O que é o score Fairscale nos perfis?", a: "Um score de reputação externo on-chain derivado de sinais publicamente verificáveis (empréstimos pagos, execuções, volume, idade da wallet, laços sociais). A Agio não calcula — o Fairscale calcula. O leaderboard ordena por esse score." },
      { q: "Onde reporto um bug?", a: "GitHub Issues em github.com/agionetwork/agio-private-lending/issues." },
    ],
  },
  zh: {
    title: "常见问题",
    lead: "对最常见问题的快速回答。",
    items: [
      { q: "Agio 在主网上线了吗？", a: "尚未。该协议目前在 Solana devnet 上完全运行。主网发布在路线图上，需通过外部审计后才会上线。" },
      { q: "Agio 与 Aave 或 Compound 有什么不同？", a: "Aave 和 Compound 是池化借贷：每个存款人共享一个大池的风险。Agio 是点对点：每笔贷款都是一个 1 对 1 合约，有自己的 APY、期限和抵押品。一笔不良贷款只影响签署它的双方。" },
      { q: "如何获取 devnet SOL 和 USDC 来试用平台？", a: "SOL：任何 Solana devnet 水龙头（例如 faucet.solana.com）。Devnet USDC：使用页头的应用内水龙头按钮（在 devnet 时）或任何社区 devnet USDC 水龙头。" },
      { q: "支持哪些代币？", a: "devnet 目前运行 USDC、EURC 和 SOL（作为抵押品自动包装为 wSOL）。任何具有 Pyth 价格源的 SPL 或 Token-2022 mint 都可以在主网上添加。" },
      { q: "清算阈值是多少？", a: "如果贷款的抵押率降至 120% 以下，出借方可以清算。接受底线为 130%，因此贷款开始时至少比清算触发高出 10% 的缓冲。" },
      { q: "如果我提前还款会怎样？", a: "您仍然支付全期利息。没有提前还款折扣：出借方按全期定价。" },
      { q: "协议收取哪些费用？", a: "每笔已接受贷款收取 1% 的发起费（从已发放金额中扣除）。通过 Cloak 的私密报价增加 0.5% 的隐私溢价加上 ZK 证明成本（约 0.005 SOL）。MCP swap-tokens 收取 swap 交易量的 0.05%。" },
      { q: "我的贷款在链上可见吗？", a: "默认情况下，是的：钱包、金额、条款、抵押品都是公开的。私密模式（由 Cloak 提供支持）将您的钱包替换为隐身地址，因此观察者只能看到隐身地址，看不到您。" },
      { q: "如何取消待处理的报价？", a: "打开「贷款」，找到您的待处理报价，点击「撤销」。只有报价创建者可以撤销。一旦被接受，报价就变成有约束力的贷款，无法取消 — 只能偿还。" },
      { q: "如何连接 AI 代理？", a: "两条路径：(1) 将任何支持 MCP 的客户端（Claude Desktop、Cursor、ChatGPT MCP、自定义代码）指向 https://app.agio.network/api/mcp，或 (2) 将一行 skill 提示粘贴到您的代理中。完整设置在 AI 集成中。" },
      { q: "档案上的 Fairscale 分数是什么？", a: "一个外部链上声誉分数，源自可公开验证的信号（偿还的贷款、清算、交易量、钱包年龄、社交关系）。Agio 不计算 — Fairscale 计算。排行榜按此分数排序。" },
      { q: "我在哪里可以报告 bug？", a: "GitHub Issues 在 github.com/agionetwork/agio-private-lending/issues。" },
    ],
  },
}

export default function FaqPage() {
  const s = useT(t)
  return (
    <>
      <h1>{s.title}</h1>
      <p className="lead text-lg text-muted-foreground">
        {s.lead}
      </p>

      {s.items.map((item, i) => (
        <div key={i}>
          <h2>{item.q}</h2>
          <p>{item.a}</p>
        </div>
      ))}
    </>
  )
}
