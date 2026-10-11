import type { Schema, Struct } from '@strapi/strapi';

export interface ContentActivityTeaser extends Struct.ComponentSchema {
  collectionName: 'components_content_activity_teasers';
  info: {
    displayName: 'Activity Teaser';
  };
  attributes: {
    eyebrow: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 80;
      }>;
    image: Schema.Attribute.Media<'images'>;
    summary: Schema.Attribute.Text & Schema.Attribute.Required;
    title: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 160;
      }>;
  };
}

export interface ContentBoardMember extends Struct.ComponentSchema {
  collectionName: 'components_content_board_members';
  info: {
    displayName: 'Board Member';
  };
  attributes: {
    bio: Schema.Attribute.Text & Schema.Attribute.Required;
    name: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 160;
      }>;
    portrait: Schema.Attribute.Media<'images'>;
    role: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 160;
      }>;
  };
}

export interface ContentCallToAction extends Struct.ComponentSchema {
  collectionName: 'components_content_call_to_actions';
  info: {
    displayName: 'Call To Action';
  };
  attributes: {
    label: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 120;
      }>;
    url: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 255;
      }>;
  };
}

export interface ContentContactMethod extends Struct.ComponentSchema {
  collectionName: 'components_content_contact_methods';
  info: {
    displayName: 'Contact Method';
  };
  attributes: {
    kind: Schema.Attribute.Enumeration<['phone', 'email']> &
      Schema.Attribute.Required;
    label: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 120;
      }>;
    value: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 255;
      }>;
  };
}

export interface ContentFacility extends Struct.ComponentSchema {
  collectionName: 'components_content_facilities';
  info: {
    displayName: 'Facility';
  };
  attributes: {
    address: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 240;
      }>;
    image: Schema.Attribute.Media<'images'>;
    name: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 160;
      }>;
    summary: Schema.Attribute.Text & Schema.Attribute.Required;
  };
}

export interface ContentFeature extends Struct.ComponentSchema {
  collectionName: 'components_content_features';
  info: {
    displayName: 'Feature';
  };
  attributes: {
    body: Schema.Attribute.Text & Schema.Attribute.Required;
    eyebrow: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 80;
      }>;
    image: Schema.Attribute.Media<'images'>;
    title: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 160;
      }>;
  };
}

export interface ContentInstitutionalQuote extends Struct.ComponentSchema {
  collectionName: 'components_content_institutional_quotes';
  info: {
    displayName: 'Institutional Quote';
  };
  attributes: {
    attribution: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 120;
      }>;
    role: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 120;
      }>;
    text: Schema.Attribute.Text & Schema.Attribute.Required;
  };
}

export interface ContentMetric extends Struct.ComponentSchema {
  collectionName: 'components_content_metrics';
  info: {
    displayName: 'Metric';
  };
  attributes: {
    label: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 100;
      }>;
    value: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 40;
      }>;
  };
}

export interface ContentRegistrationStep extends Struct.ComponentSchema {
  collectionName: 'components_content_registration_steps';
  info: {
    displayName: 'Registration Step';
  };
  attributes: {
    body: Schema.Attribute.Text & Schema.Attribute.Required;
    note: Schema.Attribute.Text;
    order: Schema.Attribute.Integer &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMax<
        {
          min: 1;
        },
        number
      >;
    title: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 160;
      }>;
  };
}

export interface ContentSchedule extends Struct.ComponentSchema {
  collectionName: 'components_content_schedules';
  info: {
    displayName: 'Schedule';
  };
  attributes: {
    days: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 160;
      }>;
    time: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 100;
      }>;
    title: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 160;
      }>;
    venue: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 160;
      }>;
  };
}

export interface ContentSportProgram extends Struct.ComponentSchema {
  collectionName: 'components_content_sport_programs';
  info: {
    displayName: 'Sport Program';
  };
  attributes: {
    audience: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 120;
      }>;
    group: Schema.Attribute.Enumeration<
      ['youth-football', 'competitive-football', 'athletics', 'community']
    > &
      Schema.Attribute.Required;
    image: Schema.Attribute.Media<'images'>;
    summary: Schema.Attribute.Text & Schema.Attribute.Required;
    title: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 160;
      }>;
  };
}

export interface ContentTimelineEntry extends Struct.ComponentSchema {
  collectionName: 'components_content_timeline_entries';
  info: {
    displayName: 'Timeline Entry';
  };
  attributes: {
    body: Schema.Attribute.Text & Schema.Attribute.Required;
    title: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 160;
      }>;
    year: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 32;
      }>;
  };
}

export interface ContentValue extends Struct.ComponentSchema {
  collectionName: 'components_content_values';
  info: {
    displayName: 'Value';
  };
  attributes: {
    body: Schema.Attribute.Text & Schema.Attribute.Required;
    title: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 160;
      }>;
  };
}

export interface ContentVenue extends Struct.ComponentSchema {
  collectionName: 'components_content_venues';
  info: {
    displayName: 'Venue';
  };
  attributes: {
    address: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 240;
      }>;
    details: Schema.Attribute.Text & Schema.Attribute.Required;
    name: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 160;
      }>;
  };
}

export interface IdentitySlug extends Struct.ComponentSchema {
  collectionName: 'components_identity_slugs';
  info: {
    displayName: 'Slug';
  };
  attributes: {
    slug: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Unique &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 120;
        minLength: 3;
      }>;
    title: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 160;
      }>;
  };
}

declare module '@strapi/strapi' {
  export namespace Public {
    export interface ComponentSchemas {
      'content.activity-teaser': ContentActivityTeaser;
      'content.board-member': ContentBoardMember;
      'content.call-to-action': ContentCallToAction;
      'content.contact-method': ContentContactMethod;
      'content.facility': ContentFacility;
      'content.feature': ContentFeature;
      'content.institutional-quote': ContentInstitutionalQuote;
      'content.metric': ContentMetric;
      'content.registration-step': ContentRegistrationStep;
      'content.schedule': ContentSchedule;
      'content.sport-program': ContentSportProgram;
      'content.timeline-entry': ContentTimelineEntry;
      'content.value': ContentValue;
      'content.venue': ContentVenue;
      'identity.slug': IdentitySlug;
    }
  }
}
