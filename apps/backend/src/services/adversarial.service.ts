import type { AttackCategory } from "@prisma/client";

export type AdversarialSample = {
  strategy: string;
  value: string;
};

export function generateAdversarialVariants(
  value: string,
  category?: AttackCategory,
  round = 1
): AdversarialSample[] {
  const alternatingCase = Array.from(value)
    .map((character, index) =>
      index % 2 === 0 ? character.toUpperCase() : character.toLowerCase()
    )
    .join("");
  const commentInsertion = value.replace(/union\s+select/i, "UN/**/ION SEL/**/ECT");
  const whitespaceInsertion = value.replace(/\s+/g, "%09");

  const common: AdversarialSample[] = [
    { strategy: "url_encoding", value: encodeURIComponent(value) },
    { strategy: "double_encoding", value: encodeURIComponent(encodeURIComponent(value)) },
    { strategy: "alternating_case", value: alternatingCase },
    { strategy: "comment_insertion", value: commentInsertion },
    { strategy: "whitespace_insertion", value: whitespaceInsertion }
  ];

  const categorySpecific: AdversarialSample[] =
    category === "SQL_INJECTION"
      ? [
          { strategy: "boolean_operator_substitution", value: "1' AND 2=2--" },
          { strategy: "time_delay_function", value: "1' AND SLEEP(1)--" },
          { strategy: "benchmark_function", value: "1' AND BENCHMARK(10,MD5(1))--" }
        ]
      : category === "XSS"
        ? [
            { strategy: "tag_attribute_substitution", value: "<iframe srcdoc=alert(1)>" },
            { strategy: "body_event_substitution", value: "<body onpageshow=alert(1)>" },
            { strategy: "details_event_substitution", value: "<details ontoggle=alert(1)>" }
          ]
        : category === "PATH_TRAVERSAL"
          ? [
              { strategy: "mixed_path_encoding", value: "%2e%2e%2f%252e%252e%252fetc/passwd" },
              { strategy: "windows_separator", value: "..\\..\\windows\\win.ini" }
            ]
          : [];

  const composed =
    round > 1
      ? common.map((sample) => ({
          strategy: `round_${round}_${sample.strategy}`,
          value: encodeURIComponent(sample.value)
        }))
      : [];

  return [...common, ...categorySpecific.slice(0, Math.min(round, 3)), ...composed]
    .filter((sample) => sample.value.length <= 4096)
    .filter((sample, index, all) => all.findIndex((item) => item.value === sample.value) === index);
}
