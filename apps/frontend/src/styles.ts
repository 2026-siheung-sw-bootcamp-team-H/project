import { createGlobalStyle, css, keyframes, styled } from "styled-components";

export const GlobalStyle = createGlobalStyle`
  :root {
    font-family: system-ui, Avenir, Helvetica, Arial, sans-serif;
    line-height: 1.5;
    font-weight: 400;
    color-scheme: light dark;
    color: rgb(255 255 255 / 87%);
    background-color: #242424;
    font-synthesis: none;
    text-rendering: optimizeLegibility;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  * {
    box-sizing: border-box;
  }

  body {
    min-width: 320px;
    min-height: 100vh;
    margin: 0;
  }

  #root {
    width: 100%;
    max-width: 1280px;
    margin: 0 auto;
    padding: 2rem;
    text-align: center;
  }

  a {
    color: #646cff;
    font-weight: 500;
    text-decoration: inherit;
  }

  a:hover {
    color: #535bf2;
  }

  button {
    padding: 0.6em 1.2em;
    border: 1px solid transparent;
    border-radius: 8px;
    background-color: #1a1a1a;
    color: inherit;
    cursor: pointer;
    font-family: inherit;
    font-size: 1em;
    font-weight: 500;
    transition: border-color 0.25s;
  }

  button:hover {
    border-color: #646cff;
  }

  button:focus,
  button:focus-visible {
    outline: 4px auto -webkit-focus-ring-color;
  }

  @media (prefers-color-scheme: light) {
    :root {
      color: #213547;
      background-color: #ffffff;
    }

    a:hover {
      color: #747bff;
    }

    button {
      background-color: #f9f9f9;
    }
  }
`;

const logoSpin = keyframes`
  from {
    transform: rotate(0deg);
  }

  to {
    transform: rotate(360deg);
  }
`;

export const Root = styled.main`
  width: 100%;
`;

export const LogoRow = styled.div`
  display: flex;
  justify-content: center;
`;

export const LogoLink = styled.a`
  display: inline-flex;
`;

export const Logo = styled.img<{ $spin?: boolean }>`
  height: 6em;
  padding: 1.5em;
  will-change: filter;
  transition: filter 300ms;

  &:hover {
    filter: drop-shadow(0 0 2em #646cffaa);
  }

  ${({ $spin }) =>
    $spin
      ? css`
          &:hover {
            filter: drop-shadow(0 0 2em #61dafbaa);
          }

          @media (prefers-reduced-motion: no-preference) {
            animation: ${logoSpin} infinite 20s linear;
          }
        `
      : ""}
`;

export const Title = styled.h1`
  margin: 0.67em 0;
  font-size: 3.2em;
  line-height: 1.1;
`;

export const Card = styled.div`
  padding: 2em;
`;

export const DocsText = styled.p`
  color: #888888;
`;
