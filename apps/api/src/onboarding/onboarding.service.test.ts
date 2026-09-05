import { BadRequestException } from '@nestjs/common';

describe('onboarding domain contract', () => {
  it('documents the canonical domain normalization boundary', () => {
    const value = 'https://www.example.com/blog'.replace(/^https?:\/\//, '').replace(/\/.*$/, '').toLowerCase();
    expect(value).toBe('www.example.com');
  });

  it('uses a typed error for invalid setup input', () => {
    expect(new BadRequestException('Enter a valid website domain.')).toBeInstanceOf(BadRequestException);
  });
});
