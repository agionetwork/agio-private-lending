"use client"

import { useT, type Lang } from "../i18n"

type Term = { term: string; def: string }

const t: Record<Lang, {
  title: string
  lead: string
  terms: Term[]
}> = {
  en: {
    title: "Glossary",
    lead: "Plain-English definitions for the terms you'll see across Agio.",
    terms: [
      { term: "$agioSOL", def: "Agio's liquid staked SOL token. Earns staking yield while remaining usable as collateral and granting a fee discount on the protocol." },
      { term: "Acceptance floor", def: "Minimum collateral ratio required to accept a loan offer (130%). Loans cannot start undercollateralized." },
      { term: "APY (Annual Percentage Yield)", def: "Annualized interest rate. A 12% APY 30-day loan accrues roughly 12 / 12 = 1% over the term." },
      { term: "Auto Loan", def: "Built-in lending bot that posts and accepts offers automatically based on user-configured rules (min APY, collateral range). Compare with AI Agents (reasoning-based)." },
      { term: "Basis points (bps)", def: "1/100th of a percent. 130% = 13,000 bps. Used in the on-chain program for thresholds." },
      { term: "Cloak", def: "ZK-privacy infrastructure (shielded pool, stealth addresses, viewing keys) that powers Private Mode. External provider, see docs.cloak.ag." },
      { term: "Collateral ratio", def: "(collateral value in USD / debt value in USD) x 100%. Calculated live with Pyth prices on every collateral-sensitive operation." },
      { term: "Devnet", def: "Solana test network. All Agio activity today happens on devnet with test tokens — no real funds at risk." },
      { term: "Exclusive Counterparty", def: "Offer mode that names a single wallet as the only acceptor. Hides the offer from public listings; rest of the loan stays standard." },
      { term: "Fairscale", def: "External on-chain reputation provider that scores every Agio profile based on loan history, volume, wallet age, and social ties. Powers the leaderboard." },
      { term: "Foreclosure", def: "Lender's right to seize collateral when the loan ratio drops below 120%. Requires fresh Pyth prices on-chain." },
      { term: "JSON-RPC", def: "Request/response protocol used by the MCP server. POST a JSON envelope, get a JSON response back." },
      { term: "MCP (Model Context Protocol)", def: "Open standard for connecting AI agents to external tools. Agio exposes 37 MCP tools at /api/mcp." },
      { term: "Origination fee", def: "1% fee charged once when a loan is accepted, taken from the disbursed debt amount. Goes to the protocol treasury." },
      { term: "Privy", def: "Wallet provider used for server-side managed keys (Auto Loan agent wallets and stealth wallets in Private Mode)." },
      { term: "Pyth", def: "Solana-native oracle network used for collateral pricing. Prices are signed by publishers and posted on-chain via post_update_atomic." },
      { term: "Repaid", def: "Loan status after the borrower returns principal + interest. Collateral is released back to the borrower." },
      { term: "SPL Token", def: "Solana's standard token format. USDC and most assets on Solana are SPL tokens." },
      { term: "Stealth wallet", def: "A fresh, single-purpose Solana wallet used by Private Mode. Funded via Cloak's shielded pool so the on-chain link to your real wallet is broken." },
      { term: "Tapestry", def: "Open social graph protocol on Solana. Powers Agio profiles, follows, and friendships. Spec at docs.usetapestry.dev." },
      { term: "Token-2022", def: "Newer SPL token standard with extensions. EURC on Solana is a Token-2022. Agio handles both standards transparently." },
      { term: "Viewing key", def: "Scoped read-only credential that lets a third party reconstruct a stealth wallet's on-chain history without granting spend authority. Used for compliance disclosures." },
      { term: "wSOL (wrapped SOL)", def: "SOL wrapped as an SPL token, required for use as collateral in the program. Wrapping/unwrapping is automatic." },
      { term: "x402", def: "HTTP payment standard used by paid MCP tools. The signed Solana payment proves wallet ownership (payment = auth) and pays the per-call fee in one shot." },
    ],
  },
  es: {
    title: "Glosario",
    lead: "Definiciones en lenguaje sencillo de los términos que verás en Agio.",
    terms: [
      { term: "$agioSOL", def: "Token SOL líquido staked de Agio. Genera rendimiento de staking mientras sigue siendo utilizable como garantía y otorga descuento de comisiones en el protocolo." },
      { term: "Piso de aceptación", def: "Ratio de garantía mínimo requerido para aceptar una oferta de préstamo (130%). Los préstamos no pueden comenzar sub-colateralizados." },
      { term: "APY (Rendimiento Porcentual Anual)", def: "Tasa de interés anualizada. Un préstamo a 30 días con 12% APY acumula aproximadamente 12 / 12 = 1% durante el plazo." },
      { term: "Auto Loan", def: "Bot de préstamos integrado que publica y acepta ofertas automáticamente según reglas configuradas por el usuario (APY mínimo, rango de garantía). Compárese con Agentes IA (basados en razonamiento)." },
      { term: "Basis points (bps)", def: "1/100 de un porcentaje. 130% = 13,000 bps. Usado en el programa on-chain para umbrales." },
      { term: "Cloak", def: "Infraestructura de privacidad ZK (pool blindado, direcciones stealth, viewing keys) que impulsa el Modo Privado. Proveedor externo, ver docs.cloak.ag." },
      { term: "Ratio de garantía", def: "(valor de garantía en USD / valor de deuda en USD) x 100%. Calculado en vivo con precios Pyth en cada operación sensible a la garantía." },
      { term: "Devnet", def: "Red de pruebas de Solana. Toda la actividad de Agio hoy ocurre en devnet con tokens de prueba — sin riesgo de fondos reales." },
      { term: "Contraparte Exclusiva", def: "Modo de oferta que designa una sola wallet como único aceptador. Oculta la oferta de los listados públicos; el resto del préstamo permanece estándar." },
      { term: "Fairscale", def: "Proveedor externo de reputación on-chain que puntúa cada perfil de Agio según historial de préstamos, volumen, antigüedad de wallet y lazos sociales. Impulsa el leaderboard." },
      { term: "Ejecución (Foreclosure)", def: "Derecho del prestamista a confiscar la garantía cuando el ratio del préstamo cae por debajo del 120%. Requiere precios Pyth actualizados on-chain." },
      { term: "JSON-RPC", def: "Protocolo de request/response usado por el servidor MCP. POST un sobre JSON, recibe respuesta JSON." },
      { term: "MCP (Model Context Protocol)", def: "Estándar abierto para conectar agentes IA a herramientas externas. Agio expone 37 herramientas MCP en /api/mcp." },
      { term: "Comisión de originación", def: "Comisión del 1% cobrada una vez cuando se acepta un préstamo, tomada del monto de deuda desembolsado. Va al tesoro del protocolo." },
      { term: "Privy", def: "Proveedor de wallets usado para claves gestionadas del lado servidor (wallets de agentes Auto Loan y wallets stealth en Modo Privado)." },
      { term: "Pyth", def: "Red de oráculos nativa de Solana usada para precios de garantía. Los precios son firmados por los publicadores y publicados on-chain vía post_update_atomic." },
      { term: "Pagado (Repaid)", def: "Estado del préstamo después de que el prestatario devuelve principal + intereses. La garantía se libera de vuelta al prestatario." },
      { term: "SPL Token", def: "Formato estándar de token de Solana. USDC y la mayoría de activos en Solana son SPL tokens." },
      { term: "Stealth wallet", def: "Una wallet Solana fresca de un solo propósito usada por el Modo Privado. Financiada vía pool blindado de Cloak, rompiendo el vínculo on-chain con tu wallet real." },
      { term: "Tapestry", def: "Protocolo abierto de grafo social en Solana. Impulsa perfiles, follows y amistades en Agio. Spec en docs.usetapestry.dev." },
      { term: "Token-2022", def: "Estándar más nuevo de SPL token con extensiones. EURC en Solana es Token-2022. Agio maneja ambos estándares transparentemente." },
      { term: "Viewing key", def: "Credencial de solo lectura con alcance que permite a un tercero reconstruir el historial on-chain de una stealth wallet sin otorgar autoridad de gasto. Usada para divulgaciones de cumplimiento." },
      { term: "wSOL (SOL envuelto)", def: "SOL envuelto como SPL token, requerido para uso como garantía en el programa. El envoltorio/desenvoltorio es automático." },
      { term: "x402", def: "Estándar de pago HTTP usado por herramientas MCP de pago. El pago Solana firmado prueba propiedad de wallet (pago = autenticación) y paga la tarifa por llamada en un solo paso." },
    ],
  },
  pt: {
    title: "Glossário",
    lead: "Definições em linguagem simples dos termos que você vai ver pela Agio.",
    terms: [
      { term: "$agioSOL", def: "Token SOL líquido staked da Agio. Gera rendimento de staking enquanto continua usável como garantia e dá desconto de taxas no protocolo." },
      { term: "Piso de aceitação", def: "Taxa de garantia mínima exigida para aceitar uma oferta de empréstimo (130%). Empréstimos não podem começar sub-colateralizados." },
      { term: "APY (Rendimento Percentual Anual)", def: "Taxa de juros anualizada. Um empréstimo de 30 dias a 12% APY acumula aproximadamente 12 / 12 = 1% no prazo." },
      { term: "Auto Loan", def: "Bot de empréstimo integrado que publica e aceita ofertas automaticamente segundo regras configuradas pelo usuário (APY mínimo, faixa de garantia). Compare com Agentes IA (baseados em raciocínio)." },
      { term: "Basis points (bps)", def: "1/100 de um por cento. 130% = 13.000 bps. Usado no programa on-chain para limiares." },
      { term: "Cloak", def: "Infraestrutura de privacidade ZK (pool blindado, endereços stealth, viewing keys) que sustenta o Modo Privado. Provedor externo, ver docs.cloak.ag." },
      { term: "Taxa de garantia", def: "(valor da garantia em USD / valor da dívida em USD) x 100%. Calculada ao vivo com preços Pyth em toda operação sensível à garantia." },
      { term: "Devnet", def: "Rede de testes da Solana. Toda atividade na Agio hoje acontece na devnet com tokens de teste — sem risco de fundos reais." },
      { term: "Contraparte Exclusiva", def: "Modo de oferta que indica uma única wallet como único aceitante. Esconde a oferta de listagens públicas; o resto do empréstimo permanece padrão." },
      { term: "Fairscale", def: "Provedor externo de reputação on-chain que pontua todo perfil da Agio com base em histórico de empréstimos, volume, idade da wallet e laços sociais. Sustenta o leaderboard." },
      { term: "Execução (Foreclosure)", def: "Direito do credor de confiscar a garantia quando a taxa do empréstimo cai abaixo de 120%. Requer preços Pyth atualizados on-chain." },
      { term: "JSON-RPC", def: "Protocolo de request/response usado pelo servidor MCP. POST um envelope JSON, recebe resposta JSON." },
      { term: "MCP (Model Context Protocol)", def: "Padrão aberto para conectar agentes IA a ferramentas externas. A Agio expõe 37 ferramentas MCP em /api/mcp." },
      { term: "Taxa de originação", def: "Taxa de 1% cobrada uma vez quando um empréstimo é aceito, descontada do valor de dívida desembolsado. Vai para a tesouraria do protocolo." },
      { term: "Privy", def: "Provedor de wallets usado para chaves gerenciadas do lado servidor (wallets de agente Auto Loan e wallets stealth no Modo Privado)." },
      { term: "Pyth", def: "Rede de oráculos nativa da Solana usada para preços de garantia. Preços são assinados pelos publishers e publicados on-chain via post_update_atomic." },
      { term: "Pago (Repaid)", def: "Status do empréstimo depois que o tomador devolve principal + juros. A garantia é liberada de volta ao tomador." },
      { term: "SPL Token", def: "Formato padrão de token da Solana. USDC e a maioria dos ativos na Solana são SPL tokens." },
      { term: "Stealth wallet", def: "Uma wallet Solana fresca de propósito único usada pelo Modo Privado. Financiada via pool blindado da Cloak, quebrando a ligação on-chain com sua wallet real." },
      { term: "Tapestry", def: "Protocolo aberto de grafo social na Solana. Sustenta perfis, follows e amizades da Agio. Spec em docs.usetapestry.dev." },
      { term: "Token-2022", def: "Padrão mais novo de SPL token com extensões. EURC na Solana é Token-2022. A Agio lida com os dois padrões transparentemente." },
      { term: "Viewing key", def: "Credencial somente-leitura com escopo que permite a um terceiro reconstruir o histórico on-chain de uma stealth wallet sem dar autoridade de gasto. Usada para divulgações de compliance." },
      { term: "wSOL (SOL envelopado)", def: "SOL envelopado como SPL token, exigido para uso como garantia no programa. O envelopamento/desenvelopamento é automático." },
      { term: "x402", def: "Padrão de pagamento HTTP usado por ferramentas MCP pagas. O pagamento Solana assinado prova propriedade da wallet (pagamento = autenticação) e paga a taxa por chamada num só passo." },
    ],
  },
  zh: {
    title: "术语表",
    lead: "Agio 中常见术语的简明定义。",
    terms: [
      { term: "$agioSOL", def: "Agio 的流动质押 SOL 代币。在保持作为抵押品可用的同时获得质押收益，并在协议中提供费用折扣。" },
      { term: "接受底线", def: "接受贷款报价所需的最低抵押率（130%）。贷款不能以抵押不足的状态开始。" },
      { term: "APY（年化收益率）", def: "年化利率。12% APY 30 天贷款大约累计 12 / 12 = 1% 利息。" },
      { term: "Auto Loan", def: "内置借贷机器人，根据用户配置的规则（最低 APY、抵押范围）自动发布和接受报价。与基于推理的 AI 代理对比。" },
      { term: "基点 (bps)", def: "百分之一的百分之一。130% = 13,000 bps。在链上程序中用于阈值。" },
      { term: "Cloak", def: "ZK 隐私基础设施（屏蔽池、隐身地址、查看密钥），为私密模式提供支持。外部提供商，见 docs.cloak.ag。" },
      { term: "抵押率", def: "(以 USD 计的抵押品价值 / 以 USD 计的债务价值) x 100%。在每次抵押品敏感操作时使用 Pyth 价格实时计算。" },
      { term: "Devnet", def: "Solana 测试网络。Agio 目前所有活动都在 devnet 上使用测试代币进行 — 无真实资金风险。" },
      { term: "独家对手方", def: "将单一钱包指定为唯一接受方的报价模式。从公开列表中隐藏报价；贷款的其余部分保持标准。" },
      { term: "Fairscale", def: "外部链上声誉提供商，根据贷款历史、交易量、钱包年龄和社交关系为每个 Agio 档案打分。为排行榜提供支持。" },
      { term: "清算（Foreclosure）", def: "当贷款抵押率降至 120% 以下时，出借方有权没收抵押品。需要链上的最新 Pyth 价格。" },
      { term: "JSON-RPC", def: "MCP 服务器使用的请求/响应协议。POST 一个 JSON 信封，接收 JSON 响应。" },
      { term: "MCP（模型上下文协议）", def: "用于将 AI 代理连接到外部工具的开放标准。Agio 在 /api/mcp 上公开 37 个 MCP 工具。" },
      { term: "发起费", def: "贷款被接受时一次性收取的 1% 费用，从已发放的债务金额中扣除。归入协议金库。" },
      { term: "Privy", def: "用于服务器端管理密钥的钱包提供商（Auto Loan 代理钱包和私密模式中的隐身钱包）。" },
      { term: "Pyth", def: "用于抵押品定价的 Solana 原生预言机网络。价格由发布者签名并通过 post_update_atomic 发布到链上。" },
      { term: "已偿还（Repaid）", def: "借款人归还本金 + 利息后的贷款状态。抵押品被释放回借款人。" },
      { term: "SPL 代币", def: "Solana 的标准代币格式。USDC 和 Solana 上的大多数资产都是 SPL 代币。" },
      { term: "隐身钱包", def: "私密模式使用的全新、一次性 Solana 钱包。通过 Cloak 屏蔽池资助，从而打破与真实钱包的链上关联。" },
      { term: "Tapestry", def: "Solana 上的开放社交图谱协议。为 Agio 的档案、关注和好友关系提供支持。规范见 docs.usetapestry.dev。" },
      { term: "Token-2022", def: "带扩展的较新 SPL 代币标准。Solana 上的 EURC 是 Token-2022。Agio 透明地处理这两种标准。" },
      { term: "查看密钥（Viewing key）", def: "有范围的只读凭证，允许第三方重建隐身钱包的链上历史而不授予花费权限。用于合规披露。" },
      { term: "wSOL（包装 SOL）", def: "包装为 SPL 代币的 SOL，作为程序中抵押品所必需。包装/解包装是自动的。" },
      { term: "x402", def: "付费 MCP 工具使用的 HTTP 支付标准。签名的 Solana 支付证明钱包所有权（支付 = 身份验证），并一次性支付每次调用的费用。" },
    ],
  },
}

export default function GlossaryPage() {
  const s = useT(t)
  return (
    <>
      <h1>{s.title}</h1>
      <p className="lead text-lg text-muted-foreground">
        {s.lead}
      </p>

      <dl>
        {s.terms.map((item) => (
          <div key={item.term} style={{ marginBottom: "1.25rem" }}>
            <dt><strong>{item.term}</strong></dt>
            <dd style={{ marginLeft: 0, marginTop: "0.25rem" }}>{item.def}</dd>
          </div>
        ))}
      </dl>
    </>
  )
}
