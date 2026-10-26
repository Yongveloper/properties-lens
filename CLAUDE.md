# CLAUDE.md

Properties Lens — Java `.properties` 다국어 번들의 `\uXXXX` 를 VS Code 에서 읽기 전용으로 풀어 보여 주는 확장.
기능: 한글 보기, HEAD 대비 한글 diff, 다국어 검색, JSP·JS·Java 키 옆 문장·hover·정의 이동, 번들 동기화 명령 실행.

## 명령

```sh
pnpm install
pnpm test:unit          # vitest (test/core)
pnpm test:integration   # 실제 VS Code 를 받아 띄움 (test/integration, 첫 실행은 다운로드로 느림)
pnpm test               # 둘 다
pnpm exec tsc -p .      # 타입 검사 (@types/vscode 는 engines 하한 1.90.0 에 고정)
pnpm package            # properties-lens-<version>.vsix
```

## 구조

- `src/core/` — vscode 를 import 하지 않는 순수 로직. 단위 테스트 대상.
  - `decode.ts` `\uXXXX` 디코딩·바이트 해석, `parse.ts` properties 파서, `bundles.ts` locale·번들 판별,
    `messageIndex.ts` 키→번역 인덱스, `keys.ts` 키 패턴 매칭, `hoverText.ts`·`searchItems.ts` 표시 문자열
  - 화면 문구는 `Labels` 인자로 받는다 (기본 영어). 실제 값은 `src/labels.ts` 가 `vscode.l10n` 으로 채운다.
- `src/` — VS Code 연결 계층.
  - `indexService.ts` 번들 탐색·감시·인덱스, `decodedDocs.ts` `properties-lens:` 가상 문서,
    `autoOpen.ts` 원본 탭 → 한글 탭 교체, `diff.ts`·`git.ts` HEAD 비교, `search.ts` QuickPick,
    `keyLens.ts` 장식·hover·정의, `sync.ts` 동기화 작업

## 지켜야 할 것

- **원본 `.properties` 에 절대 쓰지 않는다.** `workspace.fs.writeFile`, `WorkspaceEdit`, `TextEditor.edit` 를 원본에 쓰는 코드를 만들지 않는다.
  통합 테스트 `never writes original` 이 번들 해시로 확인한다.
- 디코딩은 `\uXXXX` 만. `\\u` 는 리터럴, `%XX`·HTML 엔티티·기타 escape 는 그대로. 제어 문자(C0, DEL, C1)와 ` `·` ` 는
  줄 정렬과 VS Code 경고 때문에 escape 로 남긴다. 바이트는 진짜 ISO-8859-1 로 읽는다 (`TextDecoder('latin1')` 은 windows-1252 라 쓰지 않음).
- 번들 = 같은 폴더에 실제 언어 코드 locale 파일(`_ko`, `_zh_CN` …)이 있는 묶음. `_dev`·`_qa`·`_bak` 같은 접미사는 locale 이 아니다.
- 자동 교체는 `TabInputText` 만, 더티 탭·충돌 표시 파일·사용자가 원본을 고른 파일은 건드리지 않는다.
- HEAD 내용은 `git cat-file --filters` 로 받아 autocrlf/eol 변환을 맞춘다.
- `vscode.l10n.t()` 문자열을 추가하면 `l10n/bundle.l10n.ko.json` 에도 넣는다 (`test/core/manifest.test.ts` 가 검사).
  manifest 문구는 `package.nls.json` / `package.nls.ko.json`.

## 테스트

- 통합 테스트는 `scripts/make-fixture.mjs` 가 `test/fixture` 를 `.vscode-test/ws` 로 복사해 git 저장소로 만든 뒤 돈다.
  테스트가 파일을 바꾸면 `restoreWs()` 로 되돌린다.
- 통합 테스트는 `src` 모듈을 직접 import 한다 (번들된 확장과 별개 인스턴스). 인덱스 서비스만 `activate` 반환값에서 얻는다.
- 시간에 민감한 동작(탭 교체 시 선택 위치 대기 등)이 있어 기기 부하가 아주 높으면 드물게 실패할 수 있다. 다시 돌려 확인한다.

## 코드 스타일

- 들여쓰기 탭, 주석은 한국어, 기존 파일의 밀도·이름 규칙을 따른다.
- 사용자에게 보이는 문구는 영어 기본 + 한국어 번역.

## 배포

`package.json` version·`CHANGELOG.md` 갱신 → `pnpm package` → Marketplace 관리 화면에서 확장의 Update 로 `.vsix` 업로드.
