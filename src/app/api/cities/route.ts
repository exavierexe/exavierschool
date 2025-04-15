import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');

    if (!query || query.length < 2) {
      return NextResponse.json({ cities: [] });
    }

    const cities = await prisma.city.findMany({
      where: {
        OR: [
          { city_ascii: { contains: query, mode: 'insensitive' } },
          { country: { contains: query, mode: 'insensitive' } }
        ]
      },
      orderBy: { population: 'desc' },
      take: 10
    });

    // Get timezone information for each city
    const citiesWithTimezones = await Promise.all(
      cities.map(async (city) => {
        const timezone = await prisma.timeZone.findFirst({
          where: {
            countryCode: city.iso2,
            zoneType: 'city'
          }
        });

        return {
          name: city.city_ascii,
          country: city.country,
          lat: city.lat,
          lng: city.lng,
          timezone: timezone ? {
            name: timezone.zoneName,
            offset: timezone.utcOffset,
            isDst: timezone.isDst
          } : null
        };
      })
    );

    return NextResponse.json({ cities: citiesWithTimezones });
  } catch (error) {
    console.error('Error fetching cities:', error);
    return NextResponse.json(
      { error: 'Failed to fetch cities' },
      { status: 500 }
    );
  }
} 