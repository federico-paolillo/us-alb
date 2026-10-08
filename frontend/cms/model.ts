export interface ImageFormatDto {
  url: string;
  width: number;
  height: number;
}
export interface ImageDto {
  url: string;
  alt: string;
  width: number;
  height: number;
  mime: string;
  name?: string;
  caption?: string;
  formats?: Partial<Record<string, ImageFormatDto>>;
}
export interface FileDto {
  url: string;
  name: string;
  mime: string;
  ext?: string;
  size?: number;
}
export interface TextDto {
  type: "text";
  text: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
  code?: boolean;
}
export interface LinkDto {
  type: "link";
  url: string;
  children: TextDto[];
}
export type InlineDto = TextDto | LinkDto;
export interface ParagraphBlockDto {
  type: "paragraph";
  children: InlineDto[];
}
export interface HeadingBlockDto {
  type: "heading";
  level: 1 | 2 | 3 | 4 | 5 | 6;
  children: InlineDto[];
}
export interface ListItemDto {
  type: "list-item";
  children: InlineDto[];
}
export interface ListBlockDto {
  type: "list";
  format: "ordered" | "unordered";
  indentLevel?: number;
  children: (ListItemDto | ListBlockDto)[];
}
export interface QuoteBlockDto {
  type: "quote";
  children: InlineDto[];
}
export interface CodeBlockDto {
  type: "code";
  language?: string;
  children: InlineDto[];
}
export interface ImageBlockDto {
  type: "image";
  image: ImageDto;
}
export type BlockDto =
  | ParagraphBlockDto
  | HeadingBlockDto
  | ListBlockDto
  | QuoteBlockDto
  | CodeBlockDto
  | ImageBlockDto;
export type BlocksDto = BlockDto[];

export interface IdentityDto {
  slug: string;
  title: string;
}
export interface MetricDto {
  value: string;
  label: string;
}
export interface InstitutionalQuoteDto {
  text: string;
  attribution: string;
  role?: string;
}
export interface ActivityTeaserDto {
  eyebrow?: string;
  title: string;
  summary: string;
  image?: ImageDto;
}
export interface TimelineEntryDto {
  year: string;
  title: string;
  body: string;
}
export interface ValueDto {
  title: string;
  body: string;
}
export interface BoardMemberDto {
  name: string;
  role: string;
  bio: string;
  portrait?: ImageDto;
}
export interface FacilityDto {
  name: string;
  summary: string;
  address: string;
  image?: ImageDto;
}
export type SportProgramGroup =
  | "youth-football"
  | "competitive-football"
  | "athletics"
  | "community";
export interface SportProgramDto {
  group: SportProgramGroup;
  title: string;
  audience?: string;
  summary: string;
  image?: ImageDto;
}
export interface ScheduleDto {
  title: string;
  days: string;
  time: string;
  venue: string;
}
export interface VenueDto {
  name: string;
  address: string;
  details: string;
}
export interface FeatureDto {
  eyebrow?: string;
  title: string;
  body: string;
  image?: ImageDto;
}
export interface RegistrationStepDto {
  order: number;
  title: string;
  body: string;
  note?: string;
}
export interface CallToActionDto {
  label: string;
  url: string;
}

export interface HomePageDto {
  pageType: "home";
  eyebrow: string;
  headline: string;
  introduction: string;
  heroImage: ImageDto;
  metrics: MetricDto[];
  institutionalQuote: InstitutionalQuoteDto;
  activityTeasers: ActivityTeaserDto[];
}
export interface AboutPageDto {
  pageType: "about";
  eyebrow: string;
  headline: string;
  introduction: string;
  heroImage: ImageDto;
  history: BlocksDto;
  timeline: TimelineEntryDto[];
  values: ValueDto[];
  boardMembers: BoardMemberDto[];
  facilities: FacilityDto[];
  documentEyebrow: string;
  documentTitle: string;
  documentIntroduction: string;
}
export interface ActivityPageDto {
  pageType: "activity";
  eyebrow: string;
  headline: string;
  introduction: string;
  heroImage: ImageDto;
  programs: SportProgramDto[];
  schedules: ScheduleDto[];
  venues: VenueDto[];
  openTeamFeature: FeatureDto;
  athleticsFeature: FeatureDto;
  registrationIntroduction: string;
  registrationSteps: RegistrationStepDto[];
}
export interface NewsDto {
  pageType: "news-detail";
  identity: IdentityDto;
  category: string;
  summary: string;
  editorialDate: string;
  heroImage: ImageDto;
  content: BlocksDto;
  featured: boolean;
}
export interface NewsListItemDto {
  identity: IdentityDto;
  category: string;
  summary: string;
  editorialDate: string;
  heroImage: ImageDto;
  featured: boolean;
}
export interface CalendarEntryDto {
  kind: "match" | "result" | "event";
  startsAt: string;
  competition: string;
  title: string;
  homeTeam?: string;
  awayTeam?: string;
  homeScore?: number;
  awayScore?: number;
  venue: string;
  summary: string;
  callToAction?: CallToActionDto;
}
export interface OfficialDocumentDto {
  title: string;
  category: string;
  season: string;
  file: FileDto;
  displayOrder: number;
}
export type CmsPageDto = HomePageDto | AboutPageDto | ActivityPageDto | NewsDto;
export type PageType = CmsPageDto["pageType"];
