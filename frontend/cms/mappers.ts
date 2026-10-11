import type {
  AboutPageData,
  ActivityPageData,
  CalendarEntryData,
  HomePageData,
  LocationData,
  NewsData,
  OfficialDocumentData,
} from "@cmsjs/cms/client";
import type {
  AboutPageDto,
  ActivityPageDto,
  ActivityTeaserDto,
  BlockDto,
  BlocksDto,
  BoardMemberDto,
  CalendarEntryDto,
  CallToActionDto,
  ContactMethodDto,
  ContactMethodKind,
  FeatureDto,
  FileDto,
  HomePageDto,
  IdentityDto,
  ImageDto,
  ImageFormatDto,
  InlineDto,
  InstitutionalQuoteDto,
  LocationDto,
  MetricDto,
  NewsDto,
  NewsListItemDto,
  OfficialDocumentDto,
  RegistrationStepDto,
  ScheduleDto,
  SportProgramDto,
  SportProgramGroup,
  TextDto,
  TimelineEntryDto,
  ValueDto,
} from "@cmsjs/cms/model";
import type { ContentStatus } from "@cmsjs/cms/preview";
import { ok, type Result, validationError } from "@cmsjs/cms/result";

type Node = Record<string, unknown>;

function object(
  value: unknown,
  path: string,
  problems: string[],
): Node | undefined {
  if (typeof value === "object" && value !== null && !Array.isArray(value))
    return value as Node;
  problems.push(`expected object at ${path}`);
}

function requiredString(
  node: Node,
  field: string,
  path: string,
  problems: string[],
  status: ContentStatus = "published",
): string | undefined {
  const value = node[field];
  if (status === "draft" && value == null) return "";
  if (typeof value === "string") return value;
  problems.push(`expected string at ${path}.${field}`);
}

function optionalString(
  node: Node,
  field: string,
  path: string,
  problems: string[],
): string | undefined {
  const value = node[field];
  if (value == null) return undefined;
  if (typeof value === "string") return value;
  problems.push(`expected string at ${path}.${field}`);
}

function requiredNumber(
  node: Node,
  field: string,
  path: string,
  problems: string[],
): number | undefined {
  const value = node[field];
  if (typeof value === "number" && Number.isFinite(value)) return value;
  problems.push(`expected number at ${path}.${field}`);
}

function optionalNumber(
  node: Node,
  field: string,
  path: string,
  problems: string[],
): number | undefined {
  const value = node[field];
  if (value == null) return undefined;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  problems.push(`expected number at ${path}.${field}`);
}

function requiredBoolean(
  node: Node,
  field: string,
  path: string,
  problems: string[],
): boolean | undefined {
  const value = node[field];
  if (typeof value === "boolean") return value;
  problems.push(`expected boolean at ${path}.${field}`);
}

function draftDefaultBoolean(
  node: Node,
  field: string,
  path: string,
  problems: string[],
  status: ContentStatus,
): boolean | undefined {
  if (status === "draft" && node[field] == null) return false;
  return requiredBoolean(node, field, path, problems);
}

function nonNegativeInteger(
  node: Node,
  field: string,
  path: string,
  problems: string[],
  status: ContentStatus,
): number | undefined {
  if (status === "draft" && node[field] == null) return 0;
  const value = requiredNumber(node, field, path, problems);
  if (value !== undefined && (!Number.isInteger(value) || value < 0)) {
    problems.push(`expected non-negative integer at ${path}.${field}`);
    return;
  }
  return value;
}

function contactField(
  node: Node,
  field: "label" | "value",
  path: string,
  maxLength: number,
  problems: string[],
): string | undefined {
  const value = node[field];
  if (typeof value !== "string") {
    problems.push(`expected string at ${path}.${field}`);
    return;
  }
  if (field === "value" && /[\r\n]/.test(value)) {
    problems.push(`expected single-line value at ${path}.${field}`);
    return;
  }
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    problems.push(`expected non-blank string at ${path}.${field}`);
    return;
  }
  if (trimmed.length > maxLength) {
    problems.push(
      `expected at most ${maxLength} characters at ${path}.${field}`,
    );
    return;
  }
  return trimmed;
}

function phoneHref(
  value: string,
  path: string,
  problems: string[],
): `tel:${string}` | undefined {
  if (!/^\+?[0-9 \t().-]+$/.test(value)) {
    problems.push(`expected safe phone number at ${path}`);
    return;
  }
  const normalized = value.replace(/[ \t().-]/g, "");
  if (!/^\+?[0-9]{3,15}$/.test(normalized)) {
    problems.push(`expected phone number with 3 to 15 digits at ${path}`);
    return;
  }
  return `tel:${normalized}`;
}

function emailHref(
  value: string,
  path: string,
  problems: string[],
): `mailto:${string}` | undefined {
  const parts = value.split("@");
  if (parts.length !== 2) {
    problems.push(`expected safe email address at ${path}`);
    return;
  }
  const [local = "", domain = ""] = parts;
  const validLocal =
    /^[A-Za-z0-9.!$'*+_~-]+$/.test(local) &&
    !local.startsWith(".") &&
    !local.endsWith(".") &&
    !local.includes("..");
  const validDomain = domain
    .split(".")
    .every((label) => /^[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?$/.test(label));
  if (!validLocal || !validDomain) {
    problems.push(`expected safe email address at ${path}`);
    return;
  }
  return `mailto:${value}`;
}

function contactMethod(
  value: unknown,
  path: string,
  problems: string[],
): ContactMethodDto | undefined {
  const node = object(value, path, problems);
  if (!node) return;
  const kind = node.kind;
  if (kind !== "phone" && kind !== "email") {
    problems.push(`expected contact kind at ${path}.kind`);
  }
  const label = contactField(node, "label", path, 120, problems);
  const contactValue = contactField(node, "value", path, 255, problems);
  const href =
    contactValue === undefined || (kind !== "phone" && kind !== "email")
      ? undefined
      : kind === "phone"
        ? phoneHref(contactValue, `${path}.value`, problems)
        : emailHref(contactValue, `${path}.value`, problems);
  return kind === "phone" || kind === "email"
    ? label === undefined || contactValue === undefined || href === undefined
      ? undefined
      : {
          kind: kind as ContactMethodKind,
          label,
          value: contactValue,
          href,
        }
    : undefined;
}

function contactMethods(
  value: unknown,
  path: string,
  problems: string[],
  status: ContentStatus,
): ContactMethodDto[] | undefined {
  if (value == null) return [];
  if (!Array.isArray(value)) {
    problems.push(`expected array at ${path}`);
    return;
  }
  const result: ContactMethodDto[] = [];
  for (let i = 0; i < value.length; i++) {
    const itemProblems: string[] = [];
    const mapped = contactMethod(value[i], `${path}[${i}]`, itemProblems);
    if (mapped && itemProblems.length === 0) {
      result.push(mapped);
    } else if (status === "published") {
      problems.push(...itemProblems);
    }
  }
  return result;
}

function freezeDeep<T>(value: T): T {
  if (value === null || typeof value !== "object") return value;
  Object.values(value).forEach(freezeDeep);
  return Object.freeze(value);
}

function absoluteUrl(
  url: string,
  baseUrl: string,
  path: string,
  problems: string[],
): string | undefined {
  try {
    return new URL(
      url,
      baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`,
    ).toString();
  } catch {
    problems.push(`expected valid URL at ${path}`);
  }
}

function imageFormat(
  value: unknown,
  path: string,
  problems: string[],
  mediaBaseUrl: string,
): ImageFormatDto | undefined {
  const node = object(value, path, problems);
  if (!node) return;
  const url = requiredString(node, "url", path, problems);
  const width = requiredNumber(node, "width", path, problems);
  const height = requiredNumber(node, "height", path, problems);
  if (width !== undefined && width <= 0)
    problems.push(`expected positive number at ${path}.width`);
  if (height !== undefined && height <= 0)
    problems.push(`expected positive number at ${path}.height`);
  const normalizedUrl =
    url === undefined
      ? undefined
      : absoluteUrl(url, mediaBaseUrl, `${path}.url`, problems);
  if (
    url === undefined ||
    normalizedUrl === undefined ||
    width === undefined ||
    width <= 0 ||
    height === undefined ||
    height <= 0
  )
    return;
  return { url: normalizedUrl, width, height };
}

function image(
  value: unknown,
  path: string,
  problems: string[],
  mediaBaseUrl: string,
): ImageDto | undefined {
  const node = object(value, path, problems);
  if (!node) return;
  const url = requiredString(node, "url", path, problems);
  const width = requiredNumber(node, "width", path, problems);
  const height = requiredNumber(node, "height", path, problems);
  const mime = requiredString(node, "mime", path, problems);
  if (width !== undefined && width <= 0)
    problems.push(`expected positive number at ${path}.width`);
  if (height !== undefined && height <= 0)
    problems.push(`expected positive number at ${path}.height`);
  if (mime !== undefined && !mime.startsWith("image/"))
    problems.push(`expected image media at ${path}.mime`);
  const normalizedUrl =
    url === undefined
      ? undefined
      : absoluteUrl(url, mediaBaseUrl, `${path}.url`, problems);
  if (
    url === undefined ||
    normalizedUrl === undefined ||
    width === undefined ||
    height === undefined ||
    width <= 0 ||
    height <= 0 ||
    mime === undefined ||
    !mime.startsWith("image/")
  )
    return;
  const formatsNode =
    node.formats == null
      ? undefined
      : object(node.formats, `${path}.formats`, problems);
  const formats: Record<string, ImageFormatDto> = {};
  if (formatsNode) {
    for (const [key, raw] of Object.entries(formatsNode)) {
      const parsed = imageFormat(
        raw,
        `${path}.formats.${key}`,
        problems,
        mediaBaseUrl,
      );
      if (!parsed) return;
      formats[key] = parsed;
    }
  }
  const name = optionalString(node, "name", path, problems);
  const caption = optionalString(node, "caption", path, problems);
  const alt = optionalString(node, "alternativeText", path, problems) ?? "";
  return {
    url: normalizedUrl,
    alt,
    width,
    height,
    mime,
    ...(name === undefined ? {} : { name }),
    ...(caption === undefined ? {} : { caption }),
    ...(formatsNode ? { formats } : {}),
  };
}

function optionalImage(
  value: unknown,
  path: string,
  problems: string[],
  mediaBaseUrl: string,
): ImageDto | undefined {
  return value == null ? undefined : image(value, path, problems, mediaBaseUrl);
}

function file(
  value: unknown,
  path: string,
  problems: string[],
  mediaBaseUrl: string,
): FileDto | undefined {
  const node = object(value, path, problems);
  if (!node) return;
  const url = requiredString(node, "url", path, problems);
  const name = requiredString(node, "name", path, problems);
  const mime = requiredString(node, "mime", path, problems);
  if (mime !== undefined && mime !== "application/pdf")
    problems.push(`expected PDF media at ${path}.mime`);
  const ext = optionalString(node, "ext", path, problems);
  const size = optionalNumber(node, "size", path, problems);
  const normalizedUrl =
    url === undefined
      ? undefined
      : absoluteUrl(url, mediaBaseUrl, `${path}.url`, problems);
  if (
    url === undefined ||
    normalizedUrl === undefined ||
    name === undefined ||
    mime !== "application/pdf"
  )
    return;
  return {
    url: normalizedUrl,
    name,
    mime,
    ...(ext === undefined ? {} : { ext }),
    ...(size === undefined ? {} : { size }),
  };
}

function inline(
  value: unknown,
  path: string,
  problems: string[],
): InlineDto | undefined {
  const node = object(value, path, problems);
  if (!node) return;
  const type = requiredString(node, "type", path, problems);
  if (type === "text") {
    const text = requiredString(node, "text", path, problems);
    if (text === undefined) return;
    const marks: Partial<TextDto> = {};
    for (const mark of [
      "bold",
      "italic",
      "underline",
      "strikethrough",
      "code",
    ] as const) {
      const markValue = node[mark];
      if (markValue !== undefined) {
        if (typeof markValue !== "boolean")
          problems.push(`expected boolean at ${path}.${mark}`);
        else marks[mark] = markValue;
      }
    }
    return { type, text, ...marks };
  }
  if (type === "link") {
    const url = requiredString(node, "url", path, problems);
    const children = inlineArray(node.children, `${path}.children`, problems);
    if (
      url === undefined ||
      !children ||
      children.some((child) => child.type !== "text")
    )
      return;
    return { type, url, children: children as TextDto[] };
  }
  problems.push(`unsupported inline node at ${path}`);
}

function inlineArray(
  value: unknown,
  path: string,
  problems: string[],
): InlineDto[] | undefined {
  if (!Array.isArray(value)) {
    problems.push(`expected array at ${path}`);
    return;
  }
  const result: InlineDto[] = [];
  for (let i = 0; i < value.length; i++) {
    const parsed = inline(value[i], `${path}[${i}]`, problems);
    if (!parsed) return;
    result.push(parsed);
  }
  return result;
}

function block(
  value: unknown,
  path: string,
  problems: string[],
  mediaBaseUrl: string,
): BlockDto | undefined {
  const node = object(value, path, problems);
  if (!node) return;
  const type = requiredString(node, "type", path, problems);
  if (type === "image") {
    const parsed = image(node.image, `${path}.image`, problems, mediaBaseUrl);
    return parsed ? { type, image: parsed } : undefined;
  }
  if (type === "list") {
    const format = requiredString(node, "format", path, problems);
    if (format !== "ordered" && format !== "unordered") {
      problems.push(`expected list format at ${path}.format`);
      return;
    }
    if (!Array.isArray(node.children)) {
      problems.push(`expected array at ${path}.children`);
      return;
    }
    const children: import("@cmsjs/cms/model").ListBlockDto["children"] = [];
    for (let i = 0; i < node.children.length; i++) {
      const childNode = object(
        node.children[i],
        `${path}.children[${i}]`,
        problems,
      );
      if (!childNode) return;
      if (childNode.type === "list") {
        const parsed = block(
          childNode,
          `${path}.children[${i}]`,
          problems,
          mediaBaseUrl,
        );
        if (!parsed || parsed.type !== "list") return;
        children.push(parsed);
      } else if (childNode.type === "list-item") {
        const parsed = inlineArray(
          childNode.children,
          `${path}.children[${i}].children`,
          problems,
        );
        if (!parsed) return;
        children.push({ type: "list-item", children: parsed });
      } else {
        problems.push(`unsupported list child at ${path}.children[${i}]`);
        return;
      }
    }
    const indentLevel = optionalNumber(node, "indentLevel", path, problems);
    return {
      type,
      format,
      ...(indentLevel === undefined ? {} : { indentLevel }),
      children,
    };
  }
  if (["paragraph", "heading", "quote", "code"].includes(type ?? "")) {
    const children = inlineArray(node.children, `${path}.children`, problems);
    if (!children) return;
    if (type === "heading") {
      const level = requiredNumber(node, "level", path, problems);
      if (!level || level < 1 || level > 6) {
        problems.push(`expected heading level at ${path}.level`);
        return;
      }
      return { type, level: level as 1 | 2 | 3 | 4 | 5 | 6, children };
    }
    if (type === "code") {
      const language = optionalString(node, "language", path, problems);
      return {
        type,
        ...(language === undefined ? {} : { language }),
        children,
      };
    }
    return { type: type as "paragraph" | "quote", children };
  }
  problems.push(`unsupported block at ${path}`);
}

function blocks(
  value: unknown,
  path: string,
  problems: string[],
  mediaBaseUrl: string,
  status: ContentStatus,
): BlocksDto | undefined {
  if (status === "draft" && value == null) return [];
  if (!Array.isArray(value)) {
    problems.push(`expected array at ${path}`);
    return;
  }
  const result: BlocksDto = [];
  for (let i = 0; i < value.length; i++) {
    const parsed = block(value[i], `${path}[${i}]`, problems, mediaBaseUrl);
    if (!parsed) return;
    result.push(parsed);
  }
  return result;
}

function entries<T>(
  value: unknown,
  path: string,
  problems: string[],
  status: ContentStatus,
  mapper: (node: Node, path: string) => T | undefined,
): T[] | undefined {
  if (status === "draft" && value == null) return [];
  if (!Array.isArray(value)) {
    problems.push(`expected array at ${path}`);
    return;
  }
  const result: T[] = [];
  for (let i = 0; i < value.length; i++) {
    const node = object(value[i], `${path}[${i}]`, problems);
    if (!node) return;
    const mapped = mapper(node, `${path}[${i}]`);
    if (!mapped) return;
    result.push(mapped);
  }
  return result;
}

function identity(
  value: unknown,
  path: string,
  problems: string[],
  status: ContentStatus,
): IdentityDto | undefined {
  const node = object(value, path, problems);
  if (!node) return;
  const slug = requiredString(node, "slug", path, problems);
  const title = requiredString(node, "title", path, problems, status);
  return slug === undefined || title === undefined
    ? undefined
    : { slug, title };
}

function validDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return (
    !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value
  );
}

function validDateTime(value: string): boolean {
  const match =
    /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?(?:Z|[+-](\d{2}):(\d{2}))$/.exec(
      value,
    );
  if (!match || !validDate(match[1] ?? "")) return false;
  const [
    ,
    ,
    hour,
    minute,
    second = "00",
    offsetHour = "00",
    offsetMinute = "00",
  ] = match;
  return (
    Number(hour) <= 23 &&
    Number(minute) <= 59 &&
    Number(second) <= 59 &&
    Number(offsetHour) <= 23 &&
    Number(offsetMinute) <= 59 &&
    !Number.isNaN(Date.parse(value))
  );
}

function resource<T>(
  name: string,
  raw: unknown,
  parse: (node: Node, problems: string[]) => T | undefined,
): Result<T> {
  const problems: string[] = [];
  const node = object(raw, "$", problems);
  const value = node ? parse(node, problems) : undefined;
  return value && problems.length === 0
    ? ok(freezeDeep(value))
    : validationError({ resource: name }, problems);
}

export function toHomePageDto(
  raw: HomePageData,
  mediaBaseUrl: string,
  status: ContentStatus,
): Result<HomePageDto> {
  return resource("home-page", raw, (node, p) => {
    const heroImage = image(node.heroImage, "$.heroImage", p, mediaBaseUrl);
    const quoteNode = object(
      node.institutionalQuote,
      "$.institutionalQuote",
      p,
    );
    const institutionalQuote: InstitutionalQuoteDto | undefined = quoteNode
      ? (() => {
          const text = requiredString(
            quoteNode,
            "text",
            "$.institutionalQuote",
            p,
            status,
          );
          const attribution = requiredString(
            quoteNode,
            "attribution",
            "$.institutionalQuote",
            p,
            status,
          );
          const role = optionalString(
            quoteNode,
            "role",
            "$.institutionalQuote",
            p,
          );
          return text === undefined || attribution === undefined
            ? undefined
            : { text, attribution, ...(role === undefined ? {} : { role }) };
        })()
      : undefined;
    const metrics = entries<MetricDto>(
      node.metrics,
      "$.metrics",
      p,
      status,
      (n, path) => {
        const value = requiredString(n, "value", path, p, status);
        const label = requiredString(n, "label", path, p, status);
        return value === undefined || label === undefined
          ? undefined
          : { value, label };
      },
    );
    const teasers = entries<ActivityTeaserDto>(
      node.activityTeasers,
      "$.activityTeasers",
      p,
      status,
      (n, path) => {
        const title = requiredString(n, "title", path, p, status);
        const summary = requiredString(n, "summary", path, p, status);
        const eyebrow = optionalString(n, "eyebrow", path, p);
        const mappedImage = optionalImage(
          n.image,
          `${path}.image`,
          p,
          mediaBaseUrl,
        );
        return title === undefined || summary === undefined
          ? undefined
          : {
              title,
              summary,
              ...(eyebrow === undefined ? {} : { eyebrow }),
              ...(mappedImage === undefined ? {} : { image: mappedImage }),
            };
      },
    );
    const eyebrow = requiredString(node, "eyebrow", "$", p, status),
      headline = requiredString(node, "headline", "$", p, status),
      introduction = requiredString(node, "introduction", "$", p, status),
      contactHeading = optionalString(node, "contactHeading", "$", p),
      contactIntroduction = optionalString(node, "contactIntroduction", "$", p),
      mappedContactMethods = contactMethods(
        node.contactMethods,
        "$.contactMethods",
        p,
        status,
      );
    return !heroImage ||
      !institutionalQuote ||
      !metrics ||
      !teasers ||
      eyebrow === undefined ||
      headline === undefined ||
      introduction === undefined ||
      !mappedContactMethods
      ? undefined
      : {
          pageType: "home",
          eyebrow,
          headline,
          introduction,
          heroImage,
          metrics,
          institutionalQuote,
          activityTeasers: teasers,
          ...(contactHeading === undefined ? {} : { contactHeading }),
          ...(contactIntroduction === undefined ? {} : { contactIntroduction }),
          contactMethods: mappedContactMethods,
        };
  });
}

export function toLocationDto(
  raw: LocationData,
  mediaBaseUrl: string,
  status: ContentStatus,
): Result<LocationDto> {
  return resource("location", raw, (node, p) => {
    const documentId = requiredString(node, "documentId", "$", p);
    if (documentId !== undefined && documentId.trim().length === 0) {
      p.push("expected non-blank string at $.documentId");
    }
    const name = requiredString(node, "name", "$", p, status),
      address = requiredString(node, "address", "$", p, status),
      aboutSummary = optionalString(node, "aboutSummary", "$", p),
      aboutImage = optionalImage(
        node.aboutImage,
        "$.aboutImage",
        p,
        mediaBaseUrl,
      ),
      activityDetails = optionalString(node, "activityDetails", "$", p),
      mappedContactMethods = contactMethods(
        node.contactMethods,
        "$.contactMethods",
        p,
        status,
      ),
      displayOrder = nonNegativeInteger(node, "displayOrder", "$", p, status),
      showOnHome = draftDefaultBoolean(node, "showOnHome", "$", p, status),
      showOnAbout = draftDefaultBoolean(node, "showOnAbout", "$", p, status),
      showOnActivity = draftDefaultBoolean(
        node,
        "showOnActivity",
        "$",
        p,
        status,
      );
    return documentId === undefined ||
      documentId.trim().length === 0 ||
      name === undefined ||
      address === undefined ||
      !mappedContactMethods ||
      displayOrder === undefined ||
      showOnHome === undefined ||
      showOnAbout === undefined ||
      showOnActivity === undefined
      ? undefined
      : {
          documentId,
          name,
          address,
          ...(aboutSummary === undefined ? {} : { aboutSummary }),
          ...(aboutImage === undefined ? {} : { aboutImage }),
          ...(activityDetails === undefined ? {} : { activityDetails }),
          contactMethods: mappedContactMethods,
          displayOrder,
          showOnHome,
          showOnAbout,
          showOnActivity,
        };
  });
}

export function toAboutPageDto(
  raw: AboutPageData,
  mediaBaseUrl: string,
  status: ContentStatus,
): Result<AboutPageDto> {
  return resource("about-page", raw, (node, p) => {
    const heroImage = image(node.heroImage, "$.heroImage", p, mediaBaseUrl),
      history = blocks(node.history, "$.history", p, mediaBaseUrl, status);
    const timeline = entries<TimelineEntryDto>(
      node.timeline,
      "$.timeline",
      p,
      status,
      (n, path) =>
        strings3(n, path, p, status, ["year", "title", "body"]) as
          | TimelineEntryDto
          | undefined,
    );
    const values = entries<ValueDto>(
      node.values,
      "$.values",
      p,
      status,
      (n, path) =>
        strings3(n, path, p, status, ["title", "body"]) as ValueDto | undefined,
    );
    const boardMembers = entries<BoardMemberDto>(
      node.boardMembers,
      "$.boardMembers",
      p,
      status,
      (n, path) => {
        const base = strings3(n, path, p, status, ["name", "role", "bio"]);
        const portrait = optionalImage(
          n.portrait,
          `${path}.portrait`,
          p,
          mediaBaseUrl,
        );
        return base
          ? ({ ...base, ...(portrait ? { portrait } : {}) } as BoardMemberDto)
          : undefined;
      },
    );
    const scalar = strings3(node, "$", p, status, [
      "eyebrow",
      "headline",
      "introduction",
      "documentEyebrow",
      "documentTitle",
      "documentIntroduction",
    ]);
    return !heroImage ||
      !history ||
      !timeline ||
      !values ||
      !boardMembers ||
      !scalar
      ? undefined
      : ({
          pageType: "about",
          ...scalar,
          heroImage,
          history,
          timeline,
          values,
          boardMembers,
        } as AboutPageDto);
  });
}

function strings3(
  node: Node,
  path: string,
  problems: string[],
  status: ContentStatus,
  fields: string[],
): Record<string, string> | undefined {
  const result: Record<string, string> = {};
  for (const field of fields) {
    const value = requiredString(node, field, path, problems, status);
    if (value === undefined) return;
    result[field] = value;
  }
  return result;
}

export function toActivityPageDto(
  raw: ActivityPageData,
  mediaBaseUrl: string,
  status: ContentStatus,
): Result<ActivityPageDto> {
  return resource("activity-page", raw, (node, p) => {
    const heroImage = image(node.heroImage, "$.heroImage", p, mediaBaseUrl);
    const programs = entries<SportProgramDto>(
      node.programs,
      "$.programs",
      p,
      status,
      (n, path) => {
        const group = requiredString(n, "group", path, p);
        if (
          !(
            [
              "youth-football",
              "competitive-football",
              "athletics",
              "community",
            ] as string[]
          ).includes(group ?? "")
        ) {
          p.push(`expected sport program group at ${path}.group`);
          return;
        }
        const title = requiredString(n, "title", path, p, status),
          summary = requiredString(n, "summary", path, p, status),
          audience = optionalString(n, "audience", path, p),
          mappedImage = optionalImage(
            n.image,
            `${path}.image`,
            p,
            mediaBaseUrl,
          );
        return title === undefined || summary === undefined
          ? undefined
          : {
              group: group as SportProgramGroup,
              title,
              summary,
              ...(audience ? { audience } : {}),
              ...(mappedImage ? { image: mappedImage } : {}),
            };
      },
    );
    const schedules = entries<ScheduleDto>(
      node.schedules,
      "$.schedules",
      p,
      status,
      (n, path) =>
        strings3(n, path, p, status, [
          "title",
          "days",
          "time",
          "venue",
        ]) as unknown as ScheduleDto,
    );
    const feature = (value: unknown, path: string): FeatureDto | undefined => {
      const n = object(value, path, p);
      if (!n) return;
      const title = requiredString(n, "title", path, p, status),
        body = requiredString(n, "body", path, p, status),
        eyebrow = optionalString(n, "eyebrow", path, p),
        mappedImage = optionalImage(n.image, `${path}.image`, p, mediaBaseUrl);
      return title === undefined || body === undefined
        ? undefined
        : {
            title,
            body,
            ...(eyebrow ? { eyebrow } : {}),
            ...(mappedImage ? { image: mappedImage } : {}),
          };
    };
    const openTeamFeature = feature(node.openTeamFeature, "$.openTeamFeature"),
      athleticsFeature = feature(node.athleticsFeature, "$.athleticsFeature");
    const registrationSteps = entries<RegistrationStepDto>(
      node.registrationSteps,
      "$.registrationSteps",
      p,
      status,
      (n, path) => {
        const order = requiredNumber(n, "order", path, p),
          title = requiredString(n, "title", path, p, status),
          body = requiredString(n, "body", path, p, status),
          note = optionalString(n, "note", path, p);
        if (order !== undefined && (!Number.isInteger(order) || order < 1))
          p.push(`expected positive integer at ${path}.order`);
        return order === undefined ||
          !Number.isInteger(order) ||
          order < 1 ||
          title === undefined ||
          body === undefined
          ? undefined
          : { order, title, body, ...(note ? { note } : {}) };
      },
    );
    const scalar = strings3(node, "$", p, status, [
      "eyebrow",
      "headline",
      "introduction",
      "registrationIntroduction",
    ]);
    return !heroImage ||
      !programs ||
      !schedules ||
      !openTeamFeature ||
      !athleticsFeature ||
      !registrationSteps ||
      !scalar
      ? undefined
      : ({
          pageType: "activity",
          ...scalar,
          heroImage,
          programs,
          schedules,
          openTeamFeature,
          athleticsFeature,
          registrationSteps,
        } as ActivityPageDto);
  });
}

function mapNews(
  raw: NewsData,
  mediaBaseUrl: string,
  status: ContentStatus,
  detail: boolean,
): Result<NewsDto | NewsListItemDto> {
  return resource("news", raw, (node, p) => {
    const mappedIdentity = identity(node.identity, "$.identity", p, status),
      heroImage = image(node.heroImage, "$.heroImage", p, mediaBaseUrl);
    const category = requiredString(node, "category", "$", p, status),
      summary = requiredString(node, "summary", "$", p, status),
      editorialDate = requiredString(node, "editorialDate", "$", p),
      featured = requiredBoolean(node, "featured", "$", p);
    if (editorialDate !== undefined && !validDate(editorialDate))
      p.push("expected Gregorian YYYY-MM-DD at $.editorialDate");
    if (
      !mappedIdentity ||
      !heroImage ||
      category === undefined ||
      summary === undefined ||
      editorialDate === undefined ||
      featured === undefined
    )
      return;
    const base = {
      identity: mappedIdentity,
      category,
      summary,
      editorialDate,
      heroImage,
      featured,
    };
    if (!detail) return base;
    const content = blocks(node.content, "$.content", p, mediaBaseUrl, status);
    return content ? { pageType: "news-detail", ...base, content } : undefined;
  });
}

export function toNewsDto(
  raw: NewsData,
  mediaBaseUrl: string,
  status: ContentStatus,
): Result<NewsDto> {
  return mapNews(raw, mediaBaseUrl, status, true) as Result<NewsDto>;
}
export function toNewsListItemDto(
  raw: NewsData,
  mediaBaseUrl: string,
): Result<NewsListItemDto> {
  return mapNews(
    raw,
    mediaBaseUrl,
    "published",
    false,
  ) as Result<NewsListItemDto>;
}

export function toCalendarEntryDto(
  raw: CalendarEntryData,
  status: ContentStatus,
): Result<CalendarEntryDto> {
  return resource("calendar-entry", raw, (node, p) => {
    const kind = requiredString(node, "kind", "$", p);
    if (!(["match", "result", "event"] as string[]).includes(kind ?? ""))
      p.push("expected calendar kind at $.kind");
    const startsAt = requiredString(node, "startsAt", "$", p);
    if (startsAt !== undefined && !validDateTime(startsAt))
      p.push("expected ISO datetime with explicit offset at $.startsAt");
    const competition = requiredString(node, "competition", "$", p, status),
      title = requiredString(node, "title", "$", p, status),
      venue = requiredString(node, "venue", "$", p, status),
      summary = requiredString(node, "summary", "$", p, status);
    const homeTeam = optionalString(node, "homeTeam", "$", p),
      awayTeam = optionalString(node, "awayTeam", "$", p),
      homeScore = optionalNumber(node, "homeScore", "$", p),
      awayScore = optionalNumber(node, "awayScore", "$", p);
    for (const [field, score] of [
      ["homeScore", homeScore],
      ["awayScore", awayScore],
    ] as const)
      if (score !== undefined && (!Number.isInteger(score) || score < 0))
        p.push(`expected non-negative integer at $.${field}`);
    let callToAction: CallToActionDto | undefined;
    if (node.callToAction != null) {
      const c = object(node.callToAction, "$.callToAction", p);
      if (c) {
        const label = requiredString(c, "label", "$.callToAction", p, status),
          url = requiredString(c, "url", "$.callToAction", p, status);
        if (label !== undefined && url !== undefined)
          callToAction = { label, url };
      }
    }
    return !(["match", "result", "event"] as string[]).includes(kind ?? "") ||
      startsAt === undefined ||
      competition === undefined ||
      title === undefined ||
      venue === undefined ||
      summary === undefined
      ? undefined
      : {
          kind: kind as CalendarEntryDto["kind"],
          startsAt,
          competition,
          title,
          ...(homeTeam ? { homeTeam } : {}),
          ...(awayTeam ? { awayTeam } : {}),
          ...(homeScore === undefined ? {} : { homeScore }),
          ...(awayScore === undefined ? {} : { awayScore }),
          venue,
          summary,
          ...(callToAction ? { callToAction } : {}),
        };
  });
}

export function toOfficialDocumentDto(
  raw: OfficialDocumentData,
  mediaBaseUrl: string,
  status: ContentStatus,
): Result<OfficialDocumentDto> {
  return resource("official-document", raw, (node, p) => {
    const title = requiredString(node, "title", "$", p, status),
      category = requiredString(node, "category", "$", p, status),
      season = requiredString(node, "season", "$", p, status),
      displayOrder = requiredNumber(node, "displayOrder", "$", p),
      mappedFile = file(node.file, "$.file", p, mediaBaseUrl);
    return title === undefined ||
      category === undefined ||
      season === undefined ||
      displayOrder === undefined ||
      !Number.isInteger(displayOrder) ||
      displayOrder < 0 ||
      !mappedFile
      ? undefined
      : { title, category, season, displayOrder, file: mappedFile };
  });
}
