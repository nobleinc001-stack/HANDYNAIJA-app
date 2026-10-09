# HandyNaija product specification

## Summary

HandyNaija is a web marketplace that helps customers in Nigeria find and
compare local service providers. Providers can publish a professional profile,
list their services, receive requests, and build trust through completed work
and customer reviews.

## Vision

Make it easier for people to find, assess, and contact a suitable local
professional without relying only on informal referrals, while giving capable
independent providers a structured way to reach customers.

## Users

### Customer

A person who needs a service such as plumbing, electrical work, cleaning,
mechanic services, tutoring, or repairs. Customers need clear provider
information, location relevance, a straightforward way to request work, and
visibility into the request status.

### Service provider

An independent professional or small business that wants to be discovered,
explain its services and coverage area, respond to customer requests, manage
bookings, and establish a reputation.

### Administrator

A trusted operations user responsible for maintaining marketplace quality,
handling account and provider moderation, and monitoring reports and activity.
Administrative access must be granted through a controlled process, not open
public self-registration.

## Value propositions

- **Customers:** Find and compare local professionals using service details,
  location, experience, availability, and reviews.
- **Providers:** Present a professional profile and services to customers
  actively looking for help.
- **Marketplace:** Create a consistent, accountable path from discovery to
  service request and feedback.

## Core user journeys

### Find and request a service

1. A customer browses or searches by service and location.
2. The customer compares provider profiles, service listings, and feedback.
3. The customer selects a service, describes the job, supplies a location and
   preferred time, and submits a request.
4. The provider accepts or rejects the request; the parties coordinate the
   booking and track its status.
5. After completion, the customer can leave a rating and written review.

### Join as a provider

1. A provider creates an account and completes a professional profile.
2. The provider adds service categories, offerings, and service areas.
3. The provider receives and responds to requests.
4. The provider updates work status and builds a visible service record.

## Product principles

- Make provider identity, service scope, and location understandable before
  customers make contact.
- Treat reviews and verification as trust signals; do not imply a provider is
  verified unless verification has actually been completed.
- Keep the first release focused on discovery and request management.
- Never expose passwords, tokens, or private account data in public responses.
- Design for mobile browsers and the varied network conditions of the target
  market.

## Success indicators

Instrument and review these measures before setting numeric targets:

- Search-to-provider-profile conversion.
- Provider-profile-to-request conversion.
- Provider request response and acceptance rates.
- Completed requests and customer review submission rate.
- Repeat customer activity and active provider retention.
- Account, request, and review reports requiring moderation.

## Current implementation note

The current frontend contains more screens than the implemented REST API.
Consult [MVP scope](./MVP_SCOPE.md) and the [API contract](./API_CONTRACT.md)
for the distinction between implemented functionality and planned product
behavior.
