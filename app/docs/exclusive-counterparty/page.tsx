"use client"

import { useT, type Lang } from "../i18n"

const t: Record<Lang, {
  title: string
  lead: string
  what: string
  whatDesc: string
  vsPrivate: string
  vsPrivateDesc: string
  vsPrivateRows: [string, string, string][]
  thFeature: string
  thExclusive: string
  thPrivate: string
  how: string
  step1: string
  step2: string
  step3: string
  step4: string
  enforcement: string
  enforcementDesc: string
  enforcementList: string[]
  useCases: string
  useCasesList: string[]
  combine: string
  combineDesc: string
}> = {
  en: {
    title: "Exclusive Counterparty",
    lead: "Send a loan offer that only one specific wallet can accept: a 1-to-1 deal off the public marketplace.",
    what: "What it does",
    whatDesc: "When you set an exclusive counterparty, the on-chain `loan.exclusive_counterparty` field stores the target wallet pubkey, and `loan.private_status` is flipped to `PrivateBorrower` (1) or `PrivateLender` (2). The Anchor program enforces that ONLY that pubkey can accept: every other wallet's accept transaction reverts with `LenderMismatch` / `BorrowerMismatch`. The marketplace UI hides the offer from public listings and surfaces it only on the recipient's “Available Offers” tab.",
    vsPrivate: "Counterparty X Privacy",
    vsPrivateDesc: "Exclusive counterparty and private mode solve different problems. They can be combined.",
    vsPrivateRows: [
      ["Hides offer from marketplace", "Yes", "No (offer is open)"],
      ["Hides creator identity", "No (recipient sees you)", "Yes (creator is a stealth)"],
      ["Hides recipient identity", "No (you specify the pubkey)", "Yes (recipient mints a fresh stealth)"],
      ["Cost", "Standard tx fees only", "+ Cloak shield/unshield + ZK proof"],
      ["Anchor program field", "exclusive_counterparty + privateStatus", "loan.lender or loan.borrower = stealth pubkey"],
    ],
    thFeature: "Feature",
    thExclusive: "Exclusive",
    thPrivate: "Private (Cloak)",
    how: "How it works",
    step1: "Create an offer and toggle “Set exclusive counterparty”. Paste the target wallet's pubkey.",
    step2: "On-chain `private_status` becomes `1` (PrivateBorrower: lender posted, only the named borrower may accept) or `2` (PrivateLender: borrower posted, only the named lender may accept).",
    step3: "Marketplace listings filter out offers with `private_status > 0`. The target's dashboard shows the offer in “Available Offers”.",
    step4: "When the target wallet accepts, the program verifies `signer == loan.exclusive_counterparty` before transferring funds. Anyone else gets a CounterpartyMismatch error.",
    enforcement: "Cancellation rules",
    enforcementDesc: "Only the offer creator can rescind. The target cannot cancel: they can only ignore the offer.",
    enforcementList: [
      "PrivateBorrower (1): lender posted, only lender can rescind",
      "PrivateLender (2): borrower posted, only borrower can rescind",
      "Public (0): both lender and borrower can rescind their own pending offers",
    ],
    useCases: "When to use it",
    useCasesList: [
      "OTC deals with a known counterparty (better price than open marketplace)",
      "Sending funds to a friend/relative on negotiated terms",
      "Pre-arranged deals where the on-chain settlement just needs to ratify the verbal agreement",
      "Repeat business with a trusted lender/borrower (skip the marketplace bid war)",
    ],
    combine: "Combining with Private Mode",
    combineDesc: "You can set BOTH an exclusive counterparty AND enable private mode on the creator side. The recipient learns who sent the offer (because you addressed them by pubkey), but the public still sees only a stealth address as the creator. Useful when the deal needs to be private from the world, but not from the counterparty.",
  },
  es: {
    title: "Contraparte Exclusiva",
    lead: "Envía una oferta de préstamo que solo una billetera específica puede aceptar: un acuerdo 1-a-1 fuera del marketplace público.",
    what: "Qué hace",
    whatDesc: "Cuando defines una contraparte exclusiva, el campo on-chain `loan.exclusive_counterparty` almacena la pubkey objetivo, y `loan.private_status` se vuelve `PrivateBorrower` (1) o `PrivateLender` (2). El programa Anchor obliga que SOLO esa pubkey pueda aceptar: cualquier otra billetera intentando aceptar revierte con `LenderMismatch` / `BorrowerMismatch`. La UI del marketplace oculta la oferta de los listados públicos y la muestra solo en la pestaña “Available Offers” del receptor.",
    vsPrivate: "Contraparte X Privacidad",
    vsPrivateDesc: "Contraparte exclusiva y modo privado resuelven problemas distintos. Pueden combinarse.",
    vsPrivateRows: [
      ["Oculta oferta del marketplace", "Sí", "No (oferta es abierta)"],
      ["Oculta identidad del creador", "No (el receptor te ve)", "Sí (creador es una stealth)"],
      ["Oculta identidad del receptor", "No (tú das la pubkey)", "Sí (receptor crea otra stealth)"],
      ["Costo", "Solo tarifas tx estándar", "+ Cloak shield/unshield + prueba ZK"],
      ["Campo del programa", "exclusive_counterparty + privateStatus", "loan.lender o loan.borrower = pubkey stealth"],
    ],
    thFeature: "Característica",
    thExclusive: "Exclusiva",
    thPrivate: "Privado (Cloak)",
    how: "Cómo funciona",
    step1: "Crea una oferta y activa “Definir contraparte exclusiva”. Pega la pubkey de la billetera objetivo.",
    step2: "On-chain `private_status` se vuelve `1` (PrivateBorrower: prestamista publicó, solo el prestatario nombrado puede aceptar) o `2` (PrivateLender: prestatario publicó, solo el prestamista nombrado puede aceptar).",
    step3: "Listados del marketplace filtran ofertas con `private_status > 0`. El dashboard del objetivo muestra la oferta en “Available Offers”.",
    step4: "Cuando la billetera objetivo acepta, el programa verifica `signer == loan.exclusive_counterparty` antes de transferir fondos. Cualquier otro recibe un error CounterpartyMismatch.",
    enforcement: "Reglas de cancelación",
    enforcementDesc: "Solo el creador de la oferta puede rescindir. El objetivo no puede cancelar: solo puede ignorar la oferta.",
    enforcementList: [
      "PrivateBorrower (1): prestamista publicó, solo el prestamista puede rescindir",
      "PrivateLender (2): prestatario publicó, solo el prestatario puede rescindir",
      "Público (0): tanto prestamista como prestatario pueden rescindir sus propias ofertas pendientes",
    ],
    useCases: "Cuándo usarlo",
    useCasesList: [
      "Acuerdos OTC con contraparte conocida (mejor precio que marketplace abierto)",
      "Enviar fondos a familiar/amigo con términos negociados",
      "Acuerdos pre-arreglados donde el settlement on-chain solo ratifica el acuerdo verbal",
      "Negocio recurrente con prestamista/prestatario de confianza (saltarse la guerra de pujas)",
    ],
    combine: "Combinando con Modo Privado",
    combineDesc: "Puedes definir AMBOS contraparte exclusiva Y activar modo privado en el lado creador. El receptor sabe quién envió la oferta (porque lo direccionaste por pubkey), pero el público solo ve una dirección stealth como creador. Útil cuando el acuerdo debe ser privado del mundo, pero no de la contraparte.",
  },
  pt: {
    title: "Contraparte Exclusiva",
    lead: "Envie uma oferta de empréstimo que apenas uma carteira específica pode aceitar: um acordo 1-a-1 fora do marketplace público.",
    what: "O que faz",
    whatDesc: "Quando você define uma contraparte exclusiva, o campo on-chain `loan.exclusive_counterparty` armazena a pubkey alvo, e `loan.private_status` vira `PrivateBorrower` (1) ou `PrivateLender` (2). O programa Anchor garante que SOMENTE aquela pubkey possa aceitar: qualquer outra carteira tentando aceitar reverte com `LenderMismatch` / `BorrowerMismatch`. A UI do marketplace esconde a oferta dos listings públicos e mostra apenas na aba “Available Offers” do destinatário.",
    vsPrivate: "Contraparte X Privacidade",
    vsPrivateDesc: "Contraparte exclusiva e modo privado resolvem problemas diferentes. Podem ser combinados.",
    vsPrivateRows: [
      ["Esconde oferta do marketplace", "Sim", "Não (oferta é aberta)"],
      ["Esconde identidade do criador", "Não (destinatário te vê)", "Sim (criador é uma stealth)"],
      ["Esconde identidade do destinatário", "Não (você dá a pubkey)", "Sim (destinatário cria outra stealth)"],
      ["Custo", "Só taxas tx padrão", "+ Cloak shield/unshield + prova ZK"],
      ["Campo do programa", "exclusive_counterparty + privateStatus", "loan.lender ou loan.borrower = pubkey stealth"],
    ],
    thFeature: "Recurso",
    thExclusive: "Exclusiva",
    thPrivate: "Privado (Cloak)",
    how: "Como funciona",
    step1: "Crie uma oferta e ative “Definir contraparte exclusiva”. Cole a pubkey da carteira alvo.",
    step2: "On-chain `private_status` vira `1` (PrivateBorrower: lender postou, só o borrower nomeado pode aceitar) ou `2` (PrivateLender: borrower postou, só o lender nomeado pode aceitar).",
    step3: "Listings do marketplace filtram ofertas com `private_status > 0`. O dashboard do alvo mostra a oferta em “Available Offers”.",
    step4: "Quando a carteira alvo aceita, o programa verifica `signer == loan.exclusive_counterparty` antes de transferir fundos. Qualquer outra carteira recebe erro CounterpartyMismatch.",
    enforcement: "Regras de cancelamento",
    enforcementDesc: "Só o criador da oferta pode rescindir. O alvo não pode cancelar: só pode ignorar a oferta.",
    enforcementList: [
      "PrivateBorrower (1): lender postou, só o lender pode rescindir",
      "PrivateLender (2): borrower postou, só o borrower pode rescindir",
      "Público (0): tanto lender quanto borrower podem rescindir suas próprias ofertas pendentes",
    ],
    useCases: "Quando usar",
    useCasesList: [
      "Negócios OTC com contraparte conhecida (melhor preço que marketplace aberto)",
      "Enviar fundos para amigo/familiar com termos negociados",
      "Acordos pré-arranjados onde o settlement on-chain só ratifica o acordo verbal",
      "Negócio recorrente com lender/borrower de confiança (pular a guerra de bids do marketplace)",
    ],
    combine: "Combinando com Modo Privado",
    combineDesc: "Você pode definir AMBOS contraparte exclusiva E ativar modo privado no lado do criador. O destinatário sabe quem mandou a oferta (porque você endereçou por pubkey), mas o público só vê um endereço stealth como criador. Útil quando o negócio precisa ser privado do mundo, mas não da contraparte.",
  },
  zh: {
    title: "独家对手方",
    lead: "发送一个仅特定钱包可以接受的贷款报价: 在公开市场之外的 1 对 1 交易。",
    what: "功能说明",
    whatDesc: "当您设置独家对手方时，链上 `loan.exclusive_counterparty` 字段存储目标钱包公钥，`loan.private_status` 翻转为 `PrivateBorrower` (1) 或 `PrivateLender` (2)。Anchor 程序强制只有该公钥可以接受: 任何其他钱包尝试接受都会以 `LenderMismatch` / `BorrowerMismatch` 回退。市场 UI 从公开列表中隐藏报价，仅在接收者的“Available Offers”标签中显示。",
    vsPrivate: "对手方 X 隐私",
    vsPrivateDesc: "独家对手方和私密模式解决不同问题。可以组合使用。",
    vsPrivateRows: [
      ["从市场隐藏报价", "是", "否（报价开放）"],
      ["隐藏创建者身份", "否（接收者看到您）", "是（创建者是隐身）"],
      ["隐藏接收者身份", "否（您指定公钥）", "是（接收者创建新隐身）"],
      ["成本", "仅标准交易费", "+ Cloak shield/unshield + ZK 证明"],
      ["程序字段", "exclusive_counterparty + privateStatus", "loan.lender 或 loan.borrower = 隐身公钥"],
    ],
    thFeature: "特性",
    thExclusive: "独家",
    thPrivate: "私密 (Cloak)",
    how: "工作原理",
    step1: "创建报价并切换“设置独家对手方”。粘贴目标钱包公钥。",
    step2: "链上 `private_status` 变为 `1`（PrivateBorrower: 出借人发布，仅指定借款人可接受）或 `2`（PrivateLender: 借款人发布，仅指定出借人可接受）。",
    step3: "市场列表过滤掉 `private_status > 0` 的报价。目标的仪表板在“Available Offers”中显示报价。",
    step4: "当目标钱包接受时，程序在转账前验证 `signer == loan.exclusive_counterparty`。任何其他人都会得到 CounterpartyMismatch 错误。",
    enforcement: "取消规则",
    enforcementDesc: "只有报价创建者可以撤销。目标不能取消: 只能忽略报价。",
    enforcementList: [
      "PrivateBorrower (1)：出借人发布，仅出借人可撤销",
      "PrivateLender (2)：借款人发布，仅借款人可撤销",
      "公开 (0)：出借人和借款人都可以撤销自己的待处理报价",
    ],
    useCases: "何时使用",
    useCasesList: [
      "与已知对手方的场外交易（比开放市场更好的价格）",
      "以协商条款向朋友/家人发送资金",
      "预先安排的交易，其中链上结算仅批准口头协议",
      "与可信出借人/借款人的重复业务（跳过市场竞价战）",
    ],
    combine: "与私密模式结合",
    combineDesc: "您可以同时设置独家对手方并在创建者一侧启用私密模式。接收者知道谁发送了报价（因为您按公钥定位他们），但公众仍仅看到隐身地址作为创建者。当交易需要对世界保密但不对对手方保密时有用。",
  },
}

export default function ExclusiveCounterpartyPage() {
  const s = useT(t)
  return (
    <>
      <h1>{s.title}</h1>
      <p className="lead text-lg text-muted-foreground">{s.lead}</p>

      <h2>{s.what}</h2>
      <p>{s.whatDesc}</p>

      <h2>{s.vsPrivate}</h2>
      <p>{s.vsPrivateDesc}</p>
      <div className="not-prose my-6 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left">
              <th className="pb-2 font-medium">{s.thFeature}</th>
              <th className="pb-2 font-medium">{s.thExclusive}</th>
              <th className="pb-2 font-medium">{s.thPrivate}</th>
            </tr>
          </thead>
          <tbody className="text-muted-foreground">
            {s.vsPrivateRows.map((row, i) => (
              <tr key={i} className="border-b border-border/40">
                <td className="py-2 font-medium text-foreground">{row[0]}</td>
                <td>{row[1]}</td>
                <td>{row[2]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2>{s.how}</h2>
      <ol>
        <li>{s.step1}</li>
        <li>{s.step2}</li>
        <li>{s.step3}</li>
        <li>{s.step4}</li>
      </ol>

      <h2>{s.enforcement}</h2>
      <p>{s.enforcementDesc}</p>
      <ul>
        {s.enforcementList.map((item, i) => <li key={i}>{item}</li>)}
      </ul>

      <h2>{s.useCases}</h2>
      <ul>
        {s.useCasesList.map((item, i) => <li key={i}>{item}</li>)}
      </ul>

      <h2>{s.combine}</h2>
      <p>{s.combineDesc}</p>
    </>
  )
}
