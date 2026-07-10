import { useState } from "react";
import reactLogo from "@/assets/react.svg";
import { Card, DocsText, Logo, LogoLink, LogoRow, Root, Title } from "@/styles";

export function App() {
  const [count, setCount] = useState(0);

  return (
    <Root>
      <LogoRow>
        <LogoLink href="https://vite.dev" target="_blank" rel="noreferrer">
          <Logo src="/vite.svg" alt="Vite logo" />
        </LogoLink>
        <LogoLink href="https://react.dev" target="_blank" rel="noreferrer">
          <Logo src={reactLogo} alt="React logo" $spin />
        </LogoLink>
      </LogoRow>

      <Title>Vite + React</Title>

      <Card>
        <button type="button" onClick={() => setCount((currentCount) => currentCount + 1)}>
          count is {count}
        </button>
        <p>
          Edit <code>src/App.tsx</code> and save to test HMR
        </p>
      </Card>

      <DocsText>Click on the Vite and React logos to learn more</DocsText>
    </Root>
  );
}
