"use client"

import { useT, type Lang } from "../i18n"

const t: Record<Lang, {
  title: string
  lead: string
  problem: string
  problemDesc: string
  solution: string
  solutionDesc: string
  mechanics: string
  mechanicsDesc: string
  feeRows: [string, string, string][]
  thAction: string
  thBaseFee: string
  thAgioSolFee: string
  why: string
  whyDesc: string
  whyList: string[]
  using: string
  step1: string
  step2: string
  step3: string
  step4: string
  status: string
  statusDesc: string
}> = {
  en: {
    title: "$agioSOL: Discounted Collateral",
    lead: "An LST (liquid staking token) accepted as collateral on Agio at reduced platform fees, so borrowers don't have to give up SOL staking yield to take a loan.",
    problem: "The problem",
    problemDesc: "Posting native SOL as collateral idles your principal: you stop earning the ~7% Solana staking yield while the loan is active. For a 30-day loan, that's ~0.6% of the collateral value left on the table, often enough to wipe out the borrower's interest savings vs other lending venues.",
    solution: "The solution",
    solutionDesc: "$agioSOL is an LST. You stake SOL with a Solana validator (via the LST issuer) and receive $agioSOL representing your stake + accrued rewards. The token's exchange rate to SOL grows over time as staking rewards accumulate. You can post $agioSOL as collateral on Agio, keep earning the underlying staking yield, and pay reduced Agio platform fees as a bonus.",
    mechanics: "Fee discount mechanics",
    mechanicsDesc: "Agio's `VaultAuthority.origination_fee_bps` charges every borrower a 1% origination fee on accept. When the borrower's collateral is $agioSOL, the program applies a discount via the `agiosol_discount_bps` field, capped at 100% (zero fee). Today's parameters:",
    feeRows: [
      ["Origination (USDC/EURC collateral)", "100 bps (1%)", ":"],
      ["Origination (SOL collateral)", "100 bps (1%)", ":"],
      ["Origination ($agioSOL collateral)", "100 bps (1%)", "50 bps (0.5%), 50% off"],
      ["Liquidation (any collateral)", "0%, collateral split goes 50/50 lender/treasury", "Same"],
    ],
    thAction: "Action",
    thBaseFee: "Base Fee",
    thAgioSolFee: "$agioSOL Fee",
    why: "Why this matters",
    whyDesc: "The $agioSOL discount is intentionally calibrated so that posting it as collateral is net cheaper than posting raw SOL even before counting the staking yield kept:",
    whyList: [
      "Saves ~50 bps in Agio fees on every borrowed dollar",
      "Keeps the underlying ~7% APY from validator rewards",
      "Compounds: a 30-day loan with $agioSOL collateral nets ~1.1% in retained yield + fee discount vs SOL collateral",
      "Aligns Agio's incentive with Solana's network security: more SOL stays staked",
    ],
    using: "How to use it",
    step1: "Acquire $agioSOL via the LST issuer's mint flow (or buy on a DEX).",
    step2: "On the create-borrow form, select `$agioSOL` as the collateral token.",
    step3: "Agio's price feed config maps $agioSOL → Pyth's $agioSOL/USD oracle so the collateral ratio check uses the up-to-date exchange rate.",
    step4: "On accept, the program sees `collateral_mint == AGIOSOL_MINT` and applies the discounted origination fee automatically: no extra step from you.",
    status: "Status",
    statusDesc: "$agioSOL collateral support is implemented in the Agio program (`VaultAuthority.agiosol_discount_bps` + a per-mint check). The token itself is currently in pre-launch: the issuer keypair, mint authority and governance over the discount parameter live with the Agio core team, and the public mint will open alongside mainnet deployment.",
  },
  es: {
    title: "$agioSOL: Colateral con Descuento",
    lead: "Un LST (liquid staking token) aceptado como colateral en Agio con tarifas de plataforma reducidas, para que los prestatarios no tengan que renunciar al rendimiento de staking de SOL para pedir un préstamo.",
    problem: "El problema",
    problemDesc: "Publicar SOL nativo como colateral inactiva tu principal: dejas de ganar el ~7% de rendimiento de staking de Solana mientras el préstamo está activo. En un préstamo de 30 días, eso son ~0.6% del valor del colateral, suficiente para borrar el ahorro en intereses del prestatario.",
    solution: "La solución",
    solutionDesc: "$agioSOL es un LST. Haces stake de SOL con un validador Solana (vía el emisor LST) y recibes $agioSOL representando tu stake + recompensas acumuladas. El tipo de cambio del token a SOL crece con el tiempo. Puedes publicar $agioSOL como colateral en Agio, seguir ganando el rendimiento subyacente, y pagar tarifas de plataforma reducidas como bono.",
    mechanics: "Mecánica del descuento",
    mechanicsDesc: "El `VaultAuthority.origination_fee_bps` de Agio cobra a cada prestatario una tarifa de origen del 1% al aceptar. Cuando el colateral del prestatario es $agioSOL, el programa aplica un descuento vía `agiosol_discount_bps`, con tope del 100% (tarifa cero). Parámetros actuales:",
    feeRows: [
      ["Origen (colateral USDC/EURC)", "100 bps (1%)", ":"],
      ["Origen (colateral SOL)", "100 bps (1%)", ":"],
      ["Origen (colateral $agioSOL)", "100 bps (1%)", "50 bps (0.5%), 50% descuento"],
      ["Liquidación (cualquier colateral)", "0%, split 50/50 prestamista/tesorería", "Igual"],
    ],
    thAction: "Acción",
    thBaseFee: "Tarifa Base",
    thAgioSolFee: "Tarifa $agioSOL",
    why: "Por qué importa",
    whyDesc: "El descuento de $agioSOL está calibrado para que publicarlo como colateral sea netamente más barato que publicar SOL crudo, incluso antes de contar el rendimiento de staking retenido:",
    whyList: [
      "Ahorra ~50 bps en tarifas Agio por cada dólar prestado",
      "Mantiene el ~7% APY subyacente de recompensas de validador",
      "Compuesto: un préstamo de 30 días con colateral $agioSOL netea ~1.1% en rendimiento retenido + descuento vs colateral SOL",
      "Alinea el incentivo de Agio con la seguridad de la red Solana: más SOL queda en stake",
    ],
    using: "Cómo usarlo",
    step1: "Adquiere $agioSOL vía el flujo de mint del emisor LST (o compra en un DEX).",
    step2: "En el formulario de crear-borrow, selecciona `$agioSOL` como token colateral.",
    step3: "La config de price feed de Agio mapea $agioSOL → oracle Pyth $agioSOL/USD para que el chequeo de ratio use el tipo de cambio actualizado.",
    step4: "Al aceptar, el programa ve `collateral_mint == AGIOSOL_MINT` y aplica la tarifa de origen con descuento automáticamente: ningún paso extra de tu lado.",
    status: "Estado",
    statusDesc: "El soporte de colateral $agioSOL está implementado en el programa Agio (`VaultAuthority.agiosol_discount_bps` + chequeo por mint). El token mismo está en pre-launch: el keypair emisor, mint authority y gobierno del parámetro de descuento están con el equipo core de Agio, y el mint público abrirá junto con el despliegue de mainnet.",
  },
  pt: {
    title: "$agioSOL: Colateral com Desconto",
    lead: "Um LST (liquid staking token) aceito como colateral na Agio com taxas de plataforma reduzidas, para que borrowers não precisem abrir mão do rendimento de staking do SOL pra pegar um loan.",
    problem: "O problema",
    problemDesc: "Postar SOL nativo como colateral congela seu principal: você para de ganhar o ~7% de rendimento de staking do Solana enquanto o loan está ativo. Num loan de 30 dias, isso é ~0.6% do valor do colateral, frequentemente o suficiente pra zerar a economia de juros do borrower vs outras plataformas.",
    solution: "A solução",
    solutionDesc: "$agioSOL é um LST. Você faz stake de SOL num validador Solana (via o emissor LST) e recebe $agioSOL representando seu stake + recompensas acumuladas. A taxa de câmbio do token pro SOL cresce com o tempo. Você pode postar $agioSOL como colateral na Agio, continuar ganhando o rendimento subjacente, e pagar taxas de plataforma reduzidas como bônus.",
    mechanics: "Mecânica do desconto",
    mechanicsDesc: "O `VaultAuthority.origination_fee_bps` da Agio cobra de cada borrower uma taxa de originação de 1% no aceite. Quando o colateral do borrower é $agioSOL, o programa aplica um desconto via `agiosol_discount_bps`, capado em 100% (taxa zero). Parâmetros atuais:",
    feeRows: [
      ["Originação (colateral USDC/EURC)", "100 bps (1%)", ":"],
      ["Originação (colateral SOL)", "100 bps (1%)", ":"],
      ["Originação (colateral $agioSOL)", "100 bps (1%)", "50 bps (0.5%), 50% off"],
      ["Liquidação (qualquer colateral)", "0%, split 50/50 lender/treasury", "Igual"],
    ],
    thAction: "Ação",
    thBaseFee: "Taxa Base",
    thAgioSolFee: "Taxa $agioSOL",
    why: "Por que importa",
    whyDesc: "O desconto do $agioSOL está calibrado pra postar ele como colateral ser líquido mais barato que postar SOL puro, mesmo antes de contar o rendimento de staking retido:",
    whyList: [
      "Economiza ~50 bps em taxas Agio por cada dólar emprestado",
      "Mantém o ~7% APY subjacente de recompensas de validador",
      "Composto: um loan de 30 dias com colateral $agioSOL gera ~1.1% em rendimento retido + desconto vs colateral SOL",
      "Alinha o incentivo da Agio com a segurança da rede Solana: mais SOL fica staked",
    ],
    using: "Como usar",
    step1: "Adquira $agioSOL via o flow de mint do emissor LST (ou compre num DEX).",
    step2: "No formulário de criar-borrow, selecione `$agioSOL` como token colateral.",
    step3: "A config de price feed da Agio mapeia $agioSOL → oracle Pyth $agioSOL/USD pra o check de ratio usar a taxa de câmbio atualizada.",
    step4: "No aceite, o programa vê `collateral_mint == AGIOSOL_MINT` e aplica a taxa de originação com desconto automaticamente: nenhum passo extra do seu lado.",
    status: "Status",
    statusDesc: "Suporte de colateral $agioSOL está implementado no programa Agio (`VaultAuthority.agiosol_discount_bps` + check por mint). O token em si está em pre-launch: o keypair emissor, mint authority e governança sobre o parâmetro de desconto ficam com o time core da Agio, e o mint público abre junto com o deploy de mainnet.",
  },
  zh: {
    title: "$agioSOL: 折扣抵押",
    lead: "一种 LST（流动性质押代币），在 Agio 上以降低的平台费率被接受为抵押品，借款人无需放弃 SOL 质押收益即可获得贷款。",
    problem: "问题",
    problemDesc: "将原生 SOL 用作抵押会闲置您的本金: 在贷款激活期间，您不再赚取约 7% 的 Solana 质押收益。对于 30 天贷款，这相当于抵押价值的约 0.6%，通常足以抵消借款人相对其他借贷平台的利息节省。",
    solution: "解决方案",
    solutionDesc: "$agioSOL 是一种 LST。您通过 LST 发行方在 Solana 验证人处质押 SOL，并收到代表您的质押 + 累积奖励的 $agioSOL。代币与 SOL 的汇率随时间增长。您可以将 $agioSOL 作为抵押发布在 Agio 上，继续赚取底层质押收益，并以降低的平台费作为奖励。",
    mechanics: "费用折扣机制",
    mechanicsDesc: "Agio 的 `VaultAuthority.origination_fee_bps` 在接受时向每个借款人收取 1% 的发起费。当借款人的抵押品是 $agioSOL 时，程序通过 `agiosol_discount_bps` 字段应用折扣，上限为 100%（零费）。当前参数：",
    feeRows: [
      ["发起（USDC/EURC 抵押）", "100 bps (1%)", ":"],
      ["发起（SOL 抵押）", "100 bps (1%)", ":"],
      ["发起（$agioSOL 抵押）", "100 bps (1%)", "50 bps (0.5%): 50% 折扣"],
      ["清算（任何抵押）", "0%, 抵押 50/50 分配给出借人/财库", "相同"],
    ],
    thAction: "操作",
    thBaseFee: "基础费用",
    thAgioSolFee: "$agioSOL 费用",
    why: "为什么重要",
    whyDesc: "$agioSOL 折扣经过校准，使其作为抵押品发布比发布原始 SOL 净成本更低，甚至在计算保留的质押收益之前：",
    whyList: [
      "每借出一美元节省约 50 bps 的 Agio 费用",
      "保留约 7% APY 的底层验证人奖励",
      "复合：30 天贷款使用 $agioSOL 抵押相对 SOL 抵押净增约 1.1% 的保留收益 + 费用折扣",
      "将 Agio 的激励与 Solana 网络安全对齐: 更多 SOL 保持质押",
    ],
    using: "如何使用",
    step1: "通过 LST 发行方的铸造流程获取 $agioSOL（或在 DEX 购买）。",
    step2: "在创建借款表单上，选择 `$agioSOL` 作为抵押代币。",
    step3: "Agio 的价格供给配置将 $agioSOL → Pyth 的 $agioSOL/USD 预言机映射，使抵押比率检查使用最新汇率。",
    step4: "接受时，程序看到 `collateral_mint == AGIOSOL_MINT` 并自动应用折扣发起费: 您无需额外步骤。",
    status: "状态",
    statusDesc: "$agioSOL 抵押支持已在 Agio 程序中实现（`VaultAuthority.agiosol_discount_bps` + 按 mint 检查）。代币本身目前处于预启动阶段: 发行方密钥对、铸造授权和折扣参数治理由 Agio 核心团队持有，公开铸造将在主网部署时开放。",
  },
}

export default function AgioSolPage() {
  const s = useT(t)
  return (
    <>
      <h1>{s.title}</h1>
      <p className="lead text-lg text-muted-foreground">{s.lead}</p>

      <h2>{s.problem}</h2>
      <p>{s.problemDesc}</p>

      <h2>{s.solution}</h2>
      <p>{s.solutionDesc}</p>

      <h2>{s.mechanics}</h2>
      <p>{s.mechanicsDesc}</p>
      <div className="not-prose my-6 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left">
              <th className="pb-2 font-medium">{s.thAction}</th>
              <th className="pb-2 font-medium">{s.thBaseFee}</th>
              <th className="pb-2 font-medium">{s.thAgioSolFee}</th>
            </tr>
          </thead>
          <tbody className="text-muted-foreground">
            {s.feeRows.map((row, i) => (
              <tr key={i} className="border-b border-border/40">
                <td className="py-2 font-medium text-foreground">{row[0]}</td>
                <td>{row[1]}</td>
                <td>{row[2]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2>{s.why}</h2>
      <p>{s.whyDesc}</p>
      <ul>
        {s.whyList.map((item, i) => <li key={i}>{item}</li>)}
      </ul>

      <h2>{s.using}</h2>
      <ol>
        <li>{s.step1}</li>
        <li>{s.step2}</li>
        <li>{s.step3}</li>
        <li>{s.step4}</li>
      </ol>

      <h2>{s.status}</h2>
      <p>{s.statusDesc}</p>
    </>
  )
}
