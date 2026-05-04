"use client"

import { useT, type Lang } from "../i18n"

const t: Record<Lang, {
  title: string
  lead: string
  what: string
  whatDesc: string
  how: string
  step1: string
  step2: string
  step3: string
  step4: string
  step5: string
  guarantees: string
  guaranteesDesc: string
  hides: string
  hidesList: string[]
  reveals: string
  revealsList: string[]
  costs: string
  costsDesc: string
  costsList: string[]
  enforcement: string
  enforcementDesc: string
  tradeoffs: string
  tradeoffsDesc: string
  tradeoffsList: string[]
  learnMoreCloak: string
  learnMoreCloakDesc: string
  learnMoreCloakLinkText: string
}> = {
  en: {
    title: "Private Mode",
    lead: "Create and accept loan offers without exposing your wallet identity, powered by Cloak ZK proofs.",
    what: "What it does",
    whatDesc: "Private mode breaks the on-chain link between your wallet and a loan you create or accept. Your funds travel through Cloak's shielded pool to a fresh stealth wallet, and the stealth becomes the lender or borrower on chain. Outside observers see only the stealth pubkey: they cannot prove it belongs to you.",
    how: "How it works",
    step1: "You toggle “Private” on the create-offer form.",
    step2: "Server mints a fresh Privy stealth wallet bound to your account in Redis (never on chain).",
    step3: "Your wallet shields funds into the Cloak pool (publicly visible deposit).",
    step4: "The pool unshields the same value to the stealth wallet (no on-chain link to your shield, ZK proof gates the spend).",
    step5: "The stealth wallet signs the Anchor `createBorrowOffer` / `createLendOffer` instruction. On chain, `loan.lender` (or `loan.borrower`) is the stealth pubkey.",
    guarantees: "What it hides vs reveals",
    guaranteesDesc: "Privacy strength scales with Cloak pool depth, timing jitter and value-bucketing. On a small/young pool the analyst can correlate by amount and timing; on a deep mainnet pool with steady throughput the link is hard to recover.",
    hides: "Hidden:",
    hidesList: [
      "Direct on-chain link from your main wallet to the loan account",
      "Your wallet address from any counterparty browsing the marketplace",
      "Counterparty identity from your dashboard view (UX-side mask) when you opted into privacy",
    ],
    reveals: "Visible:",
    revealsList: [
      "The stealth pubkey on chain (any explorer shows it)",
      "Loan terms (amount, APY, duration, collateral): these are public on every Agio loan",
      "Your shield deposit into Cloak (the deposit tx is signed by your real wallet)",
      "The unshield to the stealth (the recipient pubkey is visible)",
    ],
    costs: "Costs",
    costsDesc: "Each private create-offer adds two extra transactions and a ZK proof generation step:",
    costsList: [
      "~30s extra latency for shield+unshield round-trip + browser proof gen",
      "Cloak pool fees (a few thousand lamports per round-trip on devnet)",
      "Extra Solana fees for the stealth wallet's tx (~0.005 SOL ATA rent + signature fees)",
    ],
    enforcement: "Marketplace enforcement",
    enforcementDesc: "When the offer creator is a stealth, the public “Borrow / Lend” button is HIDDEN in the marketplace. The acceptor can only respond via “Borrow Privately” / “Lend Privately”, which mints a fresh stealth on the acceptor's side too. This prevents a careless acceptor from accidentally exposing themselves against an offer that the creator chose to keep anonymous.",
    tradeoffs: "Tradeoffs",
    tradeoffsDesc: "Private mode is opt-in per offer, per side. The current implementation has known limitations:",
    tradeoffsList: [
      "Privacy strength depends on Cloak pool size and concurrent activity. Devnet pool is small.",
      "No timing jitter today: shield and unshield happen ~10-30s apart, observable to a careful watcher.",
      "Compliance: the user holds a viewing key over their stealth set, but no public reveal mechanism is shipped yet.",
    ],
    learnMoreCloak: "Learn more about Cloak",
    learnMoreCloakDesc: "Private mode runs on top of Cloak's shielded pool, stealth addresses, and viewing-key infrastructure. For the underlying ZK protocol, pool design, and SDK reference, see ",
    learnMoreCloakLinkText: "docs.cloak.ag",
  },
  es: {
    title: "Modo Privado",
    lead: "Crea y acepta ofertas de préstamo sin exponer tu identidad on-chain, usando pruebas ZK de Cloak.",
    what: "Qué hace",
    whatDesc: "El modo privado rompe el vínculo on-chain entre tu billetera y un préstamo que creas o aceptas. Tus fondos viajan por el pool blindado de Cloak hasta una billetera stealth fresca, y la stealth se vuelve el prestamista o prestatario on-chain. Los observadores externos ven solo la pubkey de la stealth: no pueden probar que te pertenece.",
    how: "Cómo funciona",
    step1: "Activas “Private” en el formulario de crear oferta.",
    step2: "El servidor crea una billetera stealth Privy nueva, ligada a tu cuenta en Redis (nunca on-chain).",
    step3: "Tu billetera blinda fondos en el pool de Cloak (depósito públicamente visible).",
    step4: "El pool desblinda el mismo valor a la stealth (sin vínculo on-chain con tu blindaje, prueba ZK valida el gasto).",
    step5: "La stealth firma la instrucción Anchor `createBorrowOffer` / `createLendOffer`. On-chain, `loan.lender` (o `loan.borrower`) es la pubkey stealth.",
    guarantees: "Qué oculta y qué revela",
    guaranteesDesc: "La fuerza de la privacidad escala con la profundidad del pool de Cloak, jitter temporal y agrupación de valores. Con pool pequeño/joven el analista puede correlacionar por monto y tiempo; con un pool mainnet profundo y throughput estable el vínculo es difícil de recuperar.",
    hides: "Oculto:",
    hidesList: [
      "Vínculo directo on-chain entre tu billetera principal y la cuenta del préstamo",
      "Tu dirección frente a cualquier contraparte navegando el marketplace",
      "Identidad de la contraparte en tu dashboard (máscara UX) cuando optaste por privacidad",
    ],
    reveals: "Visible:",
    revealsList: [
      "La pubkey stealth on-chain (cualquier explorer la muestra)",
      "Términos del préstamo (monto, APY, duración, colateral): son públicos en todo préstamo Agio",
      "Tu depósito de blindaje en Cloak (firmado por tu billetera real)",
      "El desblindaje a la stealth (la pubkey receptora es visible)",
    ],
    costs: "Costos",
    costsDesc: "Cada creación privada agrega dos transacciones extra y generación de prueba ZK:",
    costsList: [
      "~30s de latencia extra por shield+unshield + generación de prueba en el navegador",
      "Tarifas del pool Cloak (algunos miles de lamports por round-trip en devnet)",
      "Tarifas Solana extra para la tx de la stealth (~0.005 SOL en alquiler ATA + tarifas de firma)",
    ],
    enforcement: "Aplicación en el marketplace",
    enforcementDesc: "Cuando el creador de la oferta es una stealth, el botón público “Borrow / Lend” está OCULTO en el marketplace. El aceptador solo puede responder por “Borrow Privately” / “Lend Privately”, que crea otra stealth fresca en su lado. Esto evita que un aceptador descuidado se exponga al aceptar una oferta que el creador eligió mantener anónima.",
    tradeoffs: "Tradeoffs",
    tradeoffsDesc: "El modo privado es opt-in por oferta y por lado. La implementación actual tiene limitaciones conocidas:",
    tradeoffsList: [
      "La fuerza de la privacidad depende del tamaño del pool Cloak y actividad concurrente. El pool de devnet es pequeño.",
      "Sin jitter temporal hoy: shield y unshield ocurren con ~10-30s de diferencia, observable.",
      "Cumplimiento: el usuario tiene una viewing key sobre su set de stealths, pero aún no hay mecanismo público de revelación.",
    ],
    learnMoreCloak: "Aprende más sobre Cloak",
    learnMoreCloakDesc: "El modo privado corre sobre el pool blindado, las direcciones stealth y la infraestructura de viewing keys de Cloak. Para el protocolo ZK subyacente, el diseño del pool y la referencia del SDK, ver ",
    learnMoreCloakLinkText: "docs.cloak.ag",
  },
  pt: {
    title: "Modo Privado",
    lead: "Crie e aceite ofertas de empréstimo sem expor sua identidade on-chain, usando provas ZK do Cloak.",
    what: "O que faz",
    whatDesc: "O modo privado quebra a ligação on-chain entre sua wallet e um empréstimo que você cria ou aceita. Seus fundos passam pelo pool blindado da Cloak até uma stealth wallet fresca, e a stealth vira o lender ou borrower on-chain. Observadores externos veem apenas a pubkey stealth: não conseguem provar que ela pertence a você.",
    how: "Como funciona",
    step1: "Você ativa “Private” no formulário de criar oferta.",
    step2: "O servidor cria uma stealth wallet Privy fresca, vinculada à sua conta no Redis (nunca on-chain).",
    step3: "Sua wallet blinda fundos no pool Cloak (depósito visível publicamente).",
    step4: "O pool desblinda o mesmo valor para a stealth wallet (sem ligação on-chain com seu shield, prova ZK valida o gasto).",
    step5: "A stealth assina a instrução Anchor `createBorrowOffer` / `createLendOffer`. On-chain, `loan.lender` (ou `loan.borrower`) é a pubkey stealth.",
    guarantees: "O que esconde e o que revela",
    guaranteesDesc: "A força da privacidade escala com a profundidade do pool Cloak, timing jitter e agrupamento de valores. Com pool pequeno/jovem o analista consegue correlacionar por valor e timing; com pool mainnet profundo e throughput estável a ligação fica difícil de recuperar.",
    hides: "Escondido:",
    hidesList: [
      "Ligação direta on-chain entre sua wallet principal e a conta do loan",
      "Seu endereço para qualquer contraparte navegando o marketplace",
      "Identidade da contraparte no seu dashboard (máscara UX) quando você optou por privacidade",
    ],
    reveals: "Visível:",
    revealsList: [
      "A pubkey stealth on-chain (qualquer explorer mostra)",
      "Termos do loan (valor, APY, duração, colateral): são públicos em todo loan Agio",
      "Seu depósito de shield no Cloak (assinado pela sua wallet real)",
      "O unshield para a stealth (a pubkey destinatária é visível)",
    ],
    costs: "Custos",
    costsDesc: "Cada criação privada adiciona duas transações extras e geração de prova ZK:",
    costsList: [
      "~30s de latência extra por shield+unshield + geração de prova no navegador",
      "Taxas do pool Cloak (alguns milhares de lamports por round-trip em devnet)",
      "Taxas Solana extras para a tx da stealth (~0.005 SOL de aluguel ATA + taxas de assinatura)",
    ],
    enforcement: "Enforcement no marketplace",
    enforcementDesc: "Quando o criador da oferta é uma stealth, o botão público “Borrow / Lend” fica OCULTO no marketplace. O aceitante só pode responder via “Borrow Privately” / “Lend Privately”, que cria outra stealth fresca do lado do aceitante. Isso evita que um aceitante desatento se exponha ao aceitar uma oferta que o criador escolheu manter anônima.",
    tradeoffs: "Tradeoffs",
    tradeoffsDesc: "Modo privado é opt-in por oferta e por lado. A implementação atual tem limitações conhecidas:",
    tradeoffsList: [
      "A força da privacidade depende do tamanho do pool Cloak e atividade concorrente. O pool de devnet é pequeno.",
      "Sem jitter temporal hoje: shield e unshield acontecem com ~10-30s de diferença, observável.",
      "Compliance: o usuário tem uma viewing key sobre seu set de stealths, mas ainda não há mecanismo público de revelação.",
    ],
    learnMoreCloak: "Saiba mais sobre Cloak",
    learnMoreCloakDesc: "O modo privado roda em cima do pool blindado, dos endereços stealth e da infraestrutura de viewing keys da Cloak. Para o protocolo ZK por baixo, o design do pool e a referência do SDK, veja ",
    learnMoreCloakLinkText: "docs.cloak.ag",
  },
  zh: {
    title: "私密模式",
    lead: "通过 Cloak ZK 证明创建和接受贷款报价，无需暴露您的钱包身份。",
    what: "功能说明",
    whatDesc: "私密模式打破您的钱包与您创建或接受的贷款之间的链上关联。您的资金通过 Cloak 的屏蔽池流向一个新的隐身钱包，由该隐身钱包成为链上的出借人或借款人。外部观察者只看到隐身公钥: 无法证明它属于您。",
    how: "工作原理",
    step1: "在创建报价表单中开启“私密”。",
    step2: "服务器铸造一个新的 Privy 隐身钱包，在 Redis 中绑定到您的账户（永远不在链上）。",
    step3: "您的钱包将资金屏蔽到 Cloak 池（公开可见的存款）。",
    step4: "池将相同价值取消屏蔽到隐身钱包（与您的屏蔽无链上关联，ZK 证明验证支出）。",
    step5: "隐身钱包签署 Anchor `createBorrowOffer` / `createLendOffer` 指令。链上 `loan.lender`（或 `loan.borrower`）是隐身公钥。",
    guarantees: "隐藏与暴露",
    guaranteesDesc: "隐私强度随 Cloak 池深度、时间抖动和金额分桶而变化。在小型/年轻池上，分析师可以通过金额和时间相关；在主网深度池稳定吞吐量下，关联难以恢复。",
    hides: "隐藏:",
    hidesList: [
      "您主钱包与贷款账户之间的直接链上关联",
      "在市场浏览的任何对手方对您的地址",
      "当您选择隐私时，您仪表板视图中对手方的身份（UX 端遮罩）",
    ],
    reveals: "可见:",
    revealsList: [
      "链上的隐身公钥（任何浏览器都能看到）",
      "贷款条款（金额、APY、期限、抵押）: 在每个 Agio 贷款上都是公开的",
      "您在 Cloak 的屏蔽存款（由您的真实钱包签署）",
      "向隐身的取消屏蔽（接收方公钥可见）",
    ],
    costs: "费用",
    costsDesc: "每次私密创建报价增加两笔额外交易和一个 ZK 证明生成步骤：",
    costsList: [
      "因 shield+unshield 往返 + 浏览器证明生成而额外约 30 秒延迟",
      "Cloak 池费用（devnet 上每次往返几千 lamports）",
      "隐身钱包交易的额外 Solana 费用（约 0.005 SOL ATA 租金 + 签名费）",
    ],
    enforcement: "市场强制",
    enforcementDesc: "当报价创建者是隐身时，市场中公开的“Borrow / Lend”按钮被隐藏。接受者只能通过“Borrow Privately” / “Lend Privately”响应，这也会在接受者一方铸造一个新的隐身。这防止了不小心的接受者意外暴露自己以应对创建者选择保持匿名的报价。",
    tradeoffs: "权衡",
    tradeoffsDesc: "私密模式按报价、按方选择加入。当前实现有已知限制：",
    tradeoffsList: [
      "隐私强度取决于 Cloak 池大小和并发活动。devnet 池较小。",
      "目前没有时间抖动: shield 和 unshield 间隔约 10-30 秒，可观察。",
      "合规：用户持有其隐身集的查看密钥，但尚未提供公开揭示机制。",
    ],
    learnMoreCloak: "了解更多关于 Cloak",
    learnMoreCloakDesc: "私密模式运行在 Cloak 的屏蔽池、隐身地址和查看密钥基础设施之上。有关底层 ZK 协议、池设计和 SDK 参考，请访问 ",
    learnMoreCloakLinkText: "docs.cloak.ag",
  },
}

export default function PrivateModePage() {
  const s = useT(t)
  return (
    <>
      <h1>{s.title}</h1>
      <p className="lead text-lg text-muted-foreground">{s.lead}</p>

      <h2>{s.what}</h2>
      <p>{s.whatDesc}</p>

      <h2>{s.how}</h2>
      <ol>
        <li>{s.step1}</li>
        <li>{s.step2}</li>
        <li>{s.step3}</li>
        <li>{s.step4}</li>
        <li>{s.step5}</li>
      </ol>

      <h2>{s.guarantees}</h2>
      <p>{s.guaranteesDesc}</p>
      <h3>{s.hides}</h3>
      <ul>
        {s.hidesList.map((item, i) => <li key={i}>{item}</li>)}
      </ul>
      <h3>{s.reveals}</h3>
      <ul>
        {s.revealsList.map((item, i) => <li key={i}>{item}</li>)}
      </ul>

      <h2>{s.costs}</h2>
      <p>{s.costsDesc}</p>
      <ul>
        {s.costsList.map((item, i) => <li key={i}>{item}</li>)}
      </ul>

      <h2>{s.enforcement}</h2>
      <p>{s.enforcementDesc}</p>

      <h2>{s.tradeoffs}</h2>
      <p>{s.tradeoffsDesc}</p>
      <ul>
        {s.tradeoffsList.map((item, i) => <li key={i}>{item}</li>)}
      </ul>

      <h2>{s.learnMoreCloak}</h2>
      <p>
        {s.learnMoreCloakDesc}
        <a href="https://docs.cloak.ag/" target="_blank" rel="noopener noreferrer">{s.learnMoreCloakLinkText}</a>.
      </p>
    </>
  )
}
