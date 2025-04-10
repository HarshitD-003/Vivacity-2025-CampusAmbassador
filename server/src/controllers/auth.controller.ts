import { Request, Response } from 'express';

import bcrypt from 'bcryptjs';

import Candidate from '../models/candidate.model';

import { createSecretToken } from '../util/SecretToken';
import { generateRandomString, candidateValid } from '../util/helper';

export const signUp = async (req: Request, res: Response) => {
      const generatedRef = await generateRandomString(6);
      let { personaldetails, collegedetails } = req.body;
      const Valid = await candidateValid(
            personaldetails.Email,
            personaldetails.Phone,
      );

      if (Valid[0] && Valid[1]) {
            try {
                  const candidate = await Candidate.create({
                        name: personaldetails.Name,
                        email: personaldetails.Email,
                        password: personaldetails.ConfirmPass,
                        phone_number: personaldetails.Phone,
                        referral_id: generatedRef,
                        gender: personaldetails.Gender,
                        college_details: collegedetails,
                  });
                  const token = createSecretToken(candidate._id.toString());
                  res.cookie('token', token, {
                        httpOnly: false,
                  });
                  try {
                        const sheetApiUrl = process.env.SHEET_API1;

                        if (!sheetApiUrl) {
                              console.error(
                                    'SHEET_API environment variable is not defined.',
                              );
                              return res.status(500).json({
                                    message: 'Server configuration error.',
                              });
                        }
                        const response = await fetch(sheetApiUrl, {
                              method: 'POST',
                              headers: {
                                    Accept: 'application/json',
                                    'Content-Type': 'application/json',
                              },
                              body: JSON.stringify({
                                    data: {
                                          // Personal Details
                                          Name: personaldetails.Name,
                                          Email: personaldetails.Email,
                                          PhoneNumber: personaldetails.Phone,
                                          Gender: personaldetails.Gender,
                                          ReferralID: generatedRef,
                                          State: collegedetails.state,
                                          District: collegedetails.district,
                                          CollegeName:collegedetails.collegename,
                                          Degree: collegedetails.degree,
                                          IsSociety: collegedetails.isSociety,
                                          Society: collegedetails.society,
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
                  res.status(201).json({
                        message: 'User Signed in successfully',
                        success: true,
                        candidate,
                  });
            } catch (err) {
                  res.status(500).json({
                        error: err,
                  });
            }
      } else {
            if (!Valid[0] && !Valid[1]) {
                  res.status(409).json({
                        error: 'Email and Phone number already registered',
                        message: 'The email address and phone number provided is already associated with an existing user account.',
                  });
            } else if (!Valid[0]) {
                  res.status(409).json({
                        error: 'Email already registered',
                        message: 'The email address provided is already associated with an existing user account.',
                  });
            } else {
                  res.status(409).json({
                        error: 'Phone number already registered',
                        message: 'The phone number provided is already associated with an existing user account.',
                  });
            }
      }
};

export const Login = async (req: Request, res: Response) => {
      try {
            const { email, password } = req.body;

            const user = await Candidate.findOne({
                  email: email,
            });
            if (!user) {
                  return res.status(401).json({
                        message: 'Invalid Credentials',
                        success: false,
                  });
            }
            const auth: boolean = await bcrypt.compare(password, user.password);
            if (!auth) {
                  return res.status(401).json({
                        message: 'Invalid Credentials',
                        success: false,
                  });
            }
            const token = createSecretToken(user._id.toString());

            res.status(201).json({
                  message: 'User Signed in successfully',
                  success: true,
                  token,
                  id: user._id,
            });
      } catch (error) {
            console.log(error);
      }
};
