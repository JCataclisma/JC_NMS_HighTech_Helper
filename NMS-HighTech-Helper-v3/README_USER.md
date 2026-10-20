# NMS HighTech Helper - Quick Start / Guia Rapido

## English (US)

NMS HighTech Helper is an offline browser application for No Man's Sky. It calculates materials for Fusion Ignitors and Stasis Devices, reads Corvette parts from savegames, and provides a read-only Base Operations page.

### Main features

- Player inventory and one recognized fixed container.
- Fusion Ignitor and Stasis Device requirement calculator.
- Alphabetical Corvette parts list with player, container, and Corvette-cache quantities.
- Player-owned planetary, orbital, freighter, Corvette, and Cosmos space-station detection.
- Extractor, gas extractor, silo, pipeline, address, and portal-code information.
- Separate candidate mineral/gas network capacity estimates.

### Usage

1. Run `Launch NMS HighTech Helper.bat`.
2. Choose a language and theme.
3. Click **Load savegame** and select `save.hg`, `save2.hg`, `save3.hg`, and so on.
4. Select a save candidate and verify the detected inventory.
5. Use the calculator or open **Base Operations** from the left navigation.

The app runs locally in the browser. Savegames are selected manually and are not uploaded or modified.

### Base Operations estimates

The app uses encoded save data to group extractors, silos, and pipelines into candidate networks. The key is useful for separating many mineral and gas circuits, but it is not a guaranteed physical-connectivity graph. Silo-only groups are shown as unverified.

Potential capacity is estimated as:

`(mineral extractors + gas extractors) * 250 + silos * 1000`

This is potential capacity, not the live amount currently waiting to be collected.

## Portugues (BR)

O NMS HighTech Helper e um aplicativo offline para navegador de No Man's Sky. Ele calcula materiais para Ignitor de Fusao e Dispositivo de Estase, le pecas de Corvette dos savegames e oferece uma pagina somente leitura de Operacoes de bases.

### Principais recursos

- Inventario do jogador e um container fixo reconhecido.
- Calculadora de requisitos para Ignitor de Fusao e Dispositivo de Estase.
- Lista alfabetica de pecas de Corvette com quantidades do jogador, container e cache da Corvette.
- Deteccao de bases planetarias, orbitais, de cargueiro, Corvette e estacoes espaciais Cosmos do jogador.
- Informacoes de extratores, extratores gasosos, silos, tubulacoes, endereco e codigo de portal.
- Estimativas separadas para redes candidatas minerais e gasosas.

### Uso

1. Execute `Launch NMS HighTech Helper.bat`.
2. Escolha idioma e tema.
3. Clique em **Load savegame** e selecione `save.hg`, `save2.hg`, `save3.hg` etc.
4. Selecione um save e confira o inventario detectado.
5. Use a calculadora ou abra **Base Operations** na navegacao lateral.

O aplicativo funciona localmente no navegador. Os savegames sao selecionados manualmente e nao sao enviados nem modificados.

### Estimativas de Operacoes de bases

O aplicativo usa dados codificados do save para agrupar extratores, silos e tubulacoes em redes candidatas. Essa chave separa muitos circuitos minerais e gasosos, mas nao garante conectividade fisica. Grupos somente com silos aparecem como nao verificados.

Capacidade potencial estimada:

`(extratores minerais + extratores gasosos) * 250 + silos * 1000`

Isso representa capacidade potencial, e nao a quantidade atualmente armazenada para coleta.
