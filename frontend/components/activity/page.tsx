import { listLocations } from "@cmsjs/cms/data";
import type { ActivityPageDto, FeatureDto } from "@cmsjs/cms/model";
import { FeatureSection } from "@cmsjs/components/activity/feature";
import {
  type ActivityGroupLink,
  ActivityHero,
} from "@cmsjs/components/activity/hero";
import { ProgramsSection } from "@cmsjs/components/activity/programs";
import { RegistrationSection } from "@cmsjs/components/activity/registration";
import { SchedulesAndVenues } from "@cmsjs/components/activity/schedules-and-venues";
import { io } from "next/cache";

function hasText(value: string | undefined): boolean {
  return Boolean(value?.trim());
}

function hasFeatureContent(feature: FeatureDto): boolean {
  return (
    hasText(feature.eyebrow) ||
    hasText(feature.title) ||
    hasText(feature.body) ||
    Boolean(feature.image)
  );
}

export async function ActivityPage({ page }: { page: ActivityPageDto }) {
  await io();
  const locations = (await listLocations()).filter(
    (location) =>
      location.showOnActivity &&
      (hasText(location.name) ||
        hasText(location.address) ||
        hasText(location.activityDetails)),
  );
  const programs = page.programs.filter(
    (program) =>
      hasText(program.title) ||
      hasText(program.audience) ||
      hasText(program.summary) ||
      Boolean(program.image),
  );
  const schedules = page.schedules.filter(
    (schedule) =>
      hasText(schedule.title) ||
      hasText(schedule.days) ||
      hasText(schedule.time) ||
      hasText(schedule.venue),
  );
  const registrationSteps = page.registrationSteps
    .filter(
      (step) => hasText(step.title) || hasText(step.body) || hasText(step.note),
    )
    .toSorted((left, right) => left.order - right.order);

  const allGroupLinks = [
    {
      group: "youth-football",
      href: "#programmi-youth-football",
      label: "Scuola calcio",
    },
    {
      group: "competitive-football",
      href: "#programmi-competitive-football",
      label: "Calcio agonistico",
    },
    {
      group: "athletics",
      href: "#programmi-athletics",
      label: "Atletica FIDAL",
    },
    {
      group: "community",
      href: "#programmi-community",
      label: "Corsi comunitari",
    },
  ] as const satisfies readonly ActivityGroupLink[];
  const groupLinks = allGroupLinks.filter((link) =>
    programs.some((program) => program.group === link.group),
  );

  return (
    <main>
      <ActivityHero
        eyebrow={page.eyebrow}
        groupLinks={groupLinks}
        headline={page.headline}
        heroImage={page.heroImage}
        introduction={page.introduction}
      />
      <ProgramsSection programs={programs} />
      {hasFeatureContent(page.openTeamFeature) && (
        <FeatureSection
          fallbackLabel="Squadra Open"
          feature={page.openTeamFeature}
          id="squadra-open"
          mediaPosition="start"
        />
      )}
      {hasFeatureContent(page.athleticsFeature) && (
        <FeatureSection
          fallbackLabel="Atletica"
          feature={page.athleticsFeature}
          id="atletica-in-evidenza"
          mediaPosition="end"
        />
      )}
      <SchedulesAndVenues locations={locations} schedules={schedules} />
      <RegistrationSection
        introduction={page.registrationIntroduction}
        steps={registrationSteps}
      />
    </main>
  );
}
