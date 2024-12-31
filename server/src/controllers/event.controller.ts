import normalUser from '../models/register.model';
import { Request, Response } from 'express';
import Candidate from '../models/candidate.model';
import { UserValid } from '../util/helper';

export const RegisterUser = async (req: Request, res: Response) => {
      const { personaldetails, eventdetails } = req.body;
      console.log(personaldetails);
      try {
            const CA = await Candidate.findOne({
                  referral_id: personaldetails.referralCode,
            });

            if (personaldetails.referralCode !== '' && !CA) {
                  return res.status(404).json({
                        message: 'No CA with this referral Code Found',
                        success: 'false',
                  });
            }

            const Valid = await UserValid(
                  personaldetails.email,
                  personaldetails.mobile,
            );

            if (Valid[0] && Valid[1]) {
                  try {
                        const user = await normalUser.create({
                              name: personaldetails.name,
                              email: personaldetails.email,
                              mobile: personaldetails.mobile,
                              referralCode: personaldetails.referralCode,
                              university: personaldetails.university,
                              participant: personaldetails.participant,
                              eventInfo: eventdetails,
                        });

                        if (personaldetails.referralCode !== '') {
                              await Candidate.findByIdAndUpdate(CA?._id, {
                                    $push: { referred_candidates: user.name },
                              });
                        }

                        // Sending data to Google Sheet
                        try {
                              const sheetApiUrl = process.env.SHEET_API2;

                              if (!sheetApiUrl) {
                                    console.error(
                                          'SHEET_API environment variable is not defined.',
                                    );
                                    return res.status(500).json({
                                          message: 'Server configuration error.',
                                    });
                              }

                              const event = Array.isArray(eventdetails)
                                    ? eventdetails[0]
                                    : eventdetails;

                              const response = await fetch(sheetApiUrl, {
                                    method: 'POST',
                                    headers: {
                                          Accept: 'application/json',
                                          'Content-Type': 'application/json',
                                    },
                                    body: JSON.stringify({
                                          data: {
                                                // Personal Details
                                                Name: personaldetails.name,
                                                Email: personaldetails.email,
                                                MobileNumber:
                                                      personaldetails.mobile,
                                                University:
                                                      personaldetails.university,
                                                ReferralCode:
                                                      personaldetails.referralCode ||
                                                      '',
                                                Participant:
                                                      personaldetails.participant ||
                                                      '',

                                                // Event Details - accessing from the first event
                                                EventCategory: String(
                                                      event.category || '',
                                                ),
                                                EventName: String(
                                                      event.eventName || '',
                                                ),
                                                TeamSize: String(
                                                      event.teamSize || '',
                                                ),
                                                Captain:
                                                      event.captain === true
                                                            ? 'Yes'
                                                            : 'No',
                                                CaptainName: String(
                                                      event.captainName || '',
                                                ),
                                                TeamMembers: Array.isArray(
                                                      event.teamMembers,
                                                )
                                                      ? event.teamMembers.join(
                                                              ', ',
                                                        )
                                                      : '',

                                                // Metadata
                                                RegisteredAt:
                                                      new Date().toISOString(),
                                          },
                                    }),
                              });

                              const sheetResponse = await response.json();
                              if (response.ok) {
                                    console.log(
                                          'Data sent to Google Sheet successfully:',
                                          sheetResponse,
                                    );
                              } else {
                                    console.error(
                                          'Failed to send data to Google Sheet:',
                                          sheetResponse,
                                    );
                              }
                        } catch (sheetError) {
                              console.error(
                                    'Error while sending data to Google Sheets:',
                                    sheetError,
                              );
                        }

                        return res.status(201).json({
                              message: 'User Registered successfully',
                              success: true,
                        });
                  } catch (err) {
                        return res.status(500).json({
                              error: err,
                        });
                  }
            } else {
                  if (!Valid[0] && !Valid[1]) {
                        return res.status(409).json({
                              error: 'Email and Phone number already registered',
                              message: 'The email address and phone number provided is already associated with an existing user account.',
                        });
                  } else if (!Valid[0]) {
                        return res.status(409).json({
                              error: 'Email already registered',
                              message: 'The email address provided is already associated with an existing user account.',
                        });
                  } else {
                        return res.status(409).json({
                              error: 'Phone number already registered',
                              message: 'The phone number provided is already associated with an existing user account.',
                        });
                  }
            }
      } catch (error) {
            console.error('Error during user registration:', error);
            return res.status(500).json({
                  message: 'Failed to register user',
            });
      }
};
